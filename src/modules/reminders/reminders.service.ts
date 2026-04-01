import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { SettingsService } from '../settings/settings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SendReminderDto } from './dto/send-reminder.dto';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Asia/Amman' })
  async runDailyAutomations() {
    await this.processDailyAutomation();
  }

  @Cron('0 10 * * 0', { timeZone: 'Asia/Amman' })
  async runWeeklyAutomations() {
    await this.processWeeklyAutomation();
  }

  async overdue(ownerUserId: string) {
    const now = new Date();
    const installments = await this.installmentModel
      .find({
        ownerUserId: new Types.ObjectId(ownerUserId),
        status: { $ne: 'paid' },
        dueDate: { $lt: now },
      })
      .sort({ dueDate: -1 })
      .limit(200)
      .exec();

    return this.hydrateInstallments(ownerUserId, installments);
  }

  async upcoming(ownerUserId: string, days = 7) {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    const installments = await this.installmentModel
      .find({
        ownerUserId: new Types.ObjectId(ownerUserId),
        status: { $ne: 'paid' },
        dueDate: { $gte: now, $lte: until },
      })
      .sort({ dueDate: 1 })
      .limit(200)
      .exec();

    return this.hydrateInstallments(ownerUserId, installments);
  }

  async sent(ownerUserId: string) {
    const items = await this.reminderModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), status: 'sent' })
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(200)
      .exec();

    const customerIds = Array.from(
      new Set(
        items
          .map((r) => r.customerId?.toString?.())
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const customers = customerIds.length
      ? await this.customerModel
          .find({ ownerUserId: new Types.ObjectId(ownerUserId), _id: { $in: customerIds } })
          .exec()
      : [];
    const customerById = new Map(customers.map((c) => [c._id.toString(), c]));

    return {
      items: items.map((r) => ({
        customer: r.customerId ? customerById.get(r.customerId.toString())?.name ?? null : null,
        customerName: r.customerId ? customerById.get(r.customerId.toString())?.name ?? null : null,
        id: r._id.toString(),
        channel: r.channel,
        status: r.status,
        installmentId: r.installmentId?.toString?.() ?? null,
        customerId: r.customerId?.toString?.() ?? null,
        debtId: r.debtId?.toString?.() ?? null,
        sentAt: r.sentAt ?? null,
        createdAt: (r as any).createdAt,
      })),
    };
  }

  async send(ownerUserId: string, dto: SendReminderDto) {
    if (!dto.installmentId) {
      throw new BadRequestException('installmentId is required for v1');
    }

    const installment = await this.installmentModel.findOne({
      _id: dto.installmentId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!installment) throw new NotFoundException('Installment not found');

    const debt = await this.debtModel.findOne({
      _id: installment.debtId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!debt) throw new NotFoundException('Debt not found');

    const customer = await this.customerModel.findOne({
      _id: debt.customerId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });

    const reminder = await this.reminderModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      channel: dto.channel,
      status: 'queued',
      installmentId: installment._id,
      debtId: debt._id,
      customerId: customer?._id,
      payload: {
        message:
          dto.message ??
          `Reminder: installment due ${installment.dueDate.toISOString()} amount ${installment.amount}`,
      },
    });

    // Mock provider: mark as sent immediately.
    reminder.status = 'sent';
    reminder.sentAt = new Date();
    await reminder.save();

    return {
      id: reminder._id.toString(),
      status: reminder.status,
      channel: reminder.channel,
      sentAt: reminder.sentAt,
    };
  }

  private async processDailyAutomation() {
    const users = await this.userModel.find({ isActive: true }).select('_id email').exec();
    for (const user of users) {
      const ownerUserId = user._id.toString();
      try {
        const settings = await this.settingsService.getNotifications(ownerUserId);
        if (settings.remindOnDelay) {
          await this.sendAutomatedOverdueReminders(ownerUserId, user.email ?? null, settings);
        }
        if (settings.remindBeforeDue) {
          await this.sendAutomatedUpcomingReminders(ownerUserId, user.email ?? null, settings, 3);
        }
      } catch (err: any) {
        this.logger.warn(`Daily reminder failed for owner ${ownerUserId}: ${err?.message ?? String(err)}`);
      }
    }
  }

  private async processWeeklyAutomation() {
    const users = await this.userModel.find({ isActive: true }).select('_id email').exec();
    for (const user of users) {
      const ownerUserId = user._id.toString();
      try {
        const settings = await this.settingsService.getNotifications(ownerUserId);
        if (!settings.weeklySummary) continue;
        await this.sendWeeklySummary(ownerUserId, user.email ?? null, settings);
      } catch (err: any) {
        this.logger.warn(`Weekly summary failed for owner ${ownerUserId}: ${err?.message ?? String(err)}`);
      }
    }
  }

  private async sendAutomatedOverdueReminders(
    ownerUserId: string,
    ownerEmail: string | null,
    settings: any,
  ) {
    const now = new Date();
    const installments = await this.installmentModel
      .find({
        ownerUserId: new Types.ObjectId(ownerUserId),
        status: { $ne: 'paid' },
        dueDate: { $lt: now },
      })
      .limit(200)
      .exec();
    if (!installments.length) return;

    const contexts = await this.hydrateInstallmentContexts(ownerUserId, installments);
    const dayStart = this.startOfDay(now);

    for (const ctx of contexts) {
      const alreadySent = await this.reminderModel.exists({
        ownerUserId: new Types.ObjectId(ownerUserId),
        installmentId: ctx.installment._id,
        status: 'sent',
        'payload.kind': 'overdue_auto',
        createdAt: { $gte: dayStart },
      });
      if (alreadySent) continue;

      const customerName = ctx.customer?.name ?? 'Customer';
      const dueDate = ctx.installment.dueDate.toISOString().slice(0, 10);
      const message = `تنبيه تأخر: ${customerName} - قسط بقيمة ${ctx.installment.amount} JOD كان بتاريخ ${dueDate}.`;
      await this.dispatchAutoReminder({
        ownerUserId,
        ownerEmail,
        settings,
        channelKind: 'overdue_auto',
        message,
        installmentId: ctx.installment._id,
        debtId: ctx.debt?._id,
        customerId: ctx.customer?._id,
      });
    }
  }

  private async sendAutomatedUpcomingReminders(
    ownerUserId: string,
    ownerEmail: string | null,
    settings: any,
    days: number,
  ) {
    const now = new Date();
    const start = this.startOfDay(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const installments = await this.installmentModel
      .find({
        ownerUserId: new Types.ObjectId(ownerUserId),
        status: { $ne: 'paid' },
        dueDate: { $gte: start, $lt: end },
      })
      .limit(200)
      .exec();
    if (!installments.length) return;

    const contexts = await this.hydrateInstallmentContexts(ownerUserId, installments);
    const dayStart = this.startOfDay(now);

    for (const ctx of contexts) {
      const alreadySent = await this.reminderModel.exists({
        ownerUserId: new Types.ObjectId(ownerUserId),
        installmentId: ctx.installment._id,
        status: 'sent',
        'payload.kind': 'upcoming_auto',
        createdAt: { $gte: dayStart },
      });
      if (alreadySent) continue;

      const customerName = ctx.customer?.name ?? 'Customer';
      const dueDate = ctx.installment.dueDate.toISOString().slice(0, 10);
      const message = `تذكير استحقاق: قسط ${customerName} بقيمة ${ctx.installment.amount} JOD مستحق بتاريخ ${dueDate}.`;
      await this.dispatchAutoReminder({
        ownerUserId,
        ownerEmail,
        settings,
        channelKind: 'upcoming_auto',
        message,
        installmentId: ctx.installment._id,
        debtId: ctx.debt?._id,
        customerId: ctx.customer?._id,
      });
    }
  }

  private async sendWeeklySummary(ownerUserId: string, ownerEmail: string | null, settings: any) {
    const weekStart = this.startOfWeek(new Date());
    const now = new Date();
    const ownerObjectId = new Types.ObjectId(ownerUserId);

    const alreadySent = await this.reminderModel.exists({
      ownerUserId: ownerObjectId,
      status: 'sent',
      'payload.kind': 'weekly_summary',
      createdAt: { $gte: weekStart },
    });
    if (alreadySent) return;

    const overdue = await this.installmentModel.find({
      ownerUserId: ownerObjectId,
      status: { $ne: 'paid' },
      dueDate: { $lt: now },
    });
    const upcomingUntil = new Date(now);
    upcomingUntil.setDate(upcomingUntil.getDate() + 7);
    const upcoming = await this.installmentModel.find({
      ownerUserId: ownerObjectId,
      status: { $ne: 'paid' },
      dueDate: { $gte: now, $lte: upcomingUntil },
    });
    const paidThisWeek = await this.installmentModel.find({
      ownerUserId: ownerObjectId,
      status: 'paid',
      paidAt: { $gte: weekStart, $lte: now },
    });

    const overdueAmount = overdue.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
    const upcomingAmount = upcoming.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
    const paidAmount = paidThisWeek.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const message =
      `ملخص أسبوعي التحصيل:\n` +
      `- عدد الأقساط المتأخرة: ${overdue.length} (إجمالي ${overdueAmount} JOD)\n` +
      `- الأقساط المستحقة خلال 7 أيام: ${upcoming.length} (إجمالي ${upcomingAmount} JOD)\n` +
      `- المحصل هذا الأسبوع: ${paidAmount} JOD`;

    await this.dispatchAutoReminder({
      ownerUserId,
      ownerEmail,
      settings,
      channelKind: 'weekly_summary',
      message,
    });
  }

  private async hydrateInstallmentContexts(ownerUserId: string, installments: InstallmentDocument[]) {
    const debtIds = Array.from(new Set(installments.map((i) => i.debtId.toString())));
    const debts = await this.debtModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), _id: { $in: debtIds } })
      .exec();
    const debtById = new Map(debts.map((d) => [d._id.toString(), d]));

    const customerIds = Array.from(new Set(debts.map((d) => d.customerId.toString())));
    const customers = await this.customerModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), _id: { $in: customerIds } })
      .exec();
    const customerById = new Map(customers.map((c) => [c._id.toString(), c]));

    return installments.map((inst) => {
      const debt = debtById.get(inst.debtId.toString());
      const customer = debt ? customerById.get(debt.customerId.toString()) : undefined;
      return { installment: inst, debt, customer };
    });
  }

  private async dispatchAutoReminder(input: {
    ownerUserId: string;
    ownerEmail: string | null;
    settings: any;
    channelKind: string;
    message: string;
    installmentId?: Types.ObjectId;
    debtId?: Types.ObjectId;
    customerId?: Types.ObjectId;
  }) {
    if (input.settings.whatsappEnabled && input.settings.customWhatsappNumber) {
      await this.sendWhatsappReminder(input);
    }
    if (input.ownerEmail) {
      await this.sendEmailReminder(input);
    }
  }

  private async sendWhatsappReminder(input: {
    ownerUserId: string;
    settings: any;
    channelKind: string;
    message: string;
    installmentId?: Types.ObjectId;
    debtId?: Types.ObjectId;
    customerId?: Types.ObjectId;
  }) {
    const reminder = await this.reminderModel.create({
      ownerUserId: new Types.ObjectId(input.ownerUserId),
      channel: 'whatsapp',
      status: 'queued',
      installmentId: input.installmentId,
      debtId: input.debtId,
      customerId: input.customerId,
      payload: { kind: input.channelKind, message: input.message },
    });

    try {
      const token = this.configService.get<string>('WHATSAPP_TOKEN');
      const phoneId = this.configService.get<string>('WHATSAPP_PHONE_ID');
      if (!token || !phoneId) throw new Error('WhatsApp credentials missing');

      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: input.settings.customWhatsappNumber,
          type: 'text',
          text: { body: input.message },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`WhatsApp API ${response.status}: ${text}`);
      }

      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();
    } catch (err: any) {
      reminder.status = 'failed';
      reminder.error = err?.message ?? String(err);
      await reminder.save();
      this.logger.warn(`WhatsApp reminder failed: ${reminder.error}`);
    }
  }

  private async sendEmailReminder(input: {
    ownerUserId: string;
    ownerEmail: string;
    channelKind: string;
    message: string;
    installmentId?: Types.ObjectId;
    debtId?: Types.ObjectId;
    customerId?: Types.ObjectId;
  }) {
    const reminder = await this.reminderModel.create({
      ownerUserId: new Types.ObjectId(input.ownerUserId),
      channel: 'email',
      status: 'queued',
      installmentId: input.installmentId,
      debtId: input.debtId,
      customerId: input.customerId,
      payload: { kind: input.channelKind, message: input.message },
    });

    try {
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
      if (!resendApiKey || !fromEmail) throw new Error('Resend credentials missing');

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.ownerEmail],
          subject: 'SADAD Notification',
          html: `<p>${input.message.replace(/\n/g, '<br/>')}</p>`,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend API ${response.status}: ${text}`);
      }

      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();
    } catch (err: any) {
      reminder.status = 'failed';
      reminder.error = err?.message ?? String(err);
      await reminder.save();
      this.logger.warn(`Email reminder failed: ${reminder.error}`);
    }
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeek(date: Date) {
    const d = this.startOfDay(date);
    const day = d.getDay(); // 0 Sunday
    d.setDate(d.getDate() - day);
    return d;
  }

  private async hydrateInstallments(ownerUserId: string, installments: InstallmentDocument[]) {
    const debtIds = Array.from(new Set(installments.map((i) => i.debtId.toString())));
    const debts = await this.debtModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), _id: { $in: debtIds } })
      .exec();
    const debtById = new Map(debts.map((d) => [d._id.toString(), d]));

    const customerIds = Array.from(
      new Set(debts.map((d) => d.customerId.toString())),
    );
    const customers = await this.customerModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), _id: { $in: customerIds } })
      .exec();
    const customerById = new Map(customers.map((c) => [c._id.toString(), c]));

    return {
      items: installments.map((inst) => {
        const debt = debtById.get(inst.debtId.toString());
        const customer = debt ? customerById.get(debt.customerId.toString()) : undefined;
        return {
          installmentId: inst._id.toString(),
          debtId: inst.debtId.toString(),
          customerId: debt?.customerId?.toString?.() ?? null,
          customerName: customer?.name ?? null,
          customerPhone: customer?.phone ?? null,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.status,
        };
      }),
    };
  }
}
