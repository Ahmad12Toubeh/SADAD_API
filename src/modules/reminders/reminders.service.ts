import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { SettingsService } from '../settings/settings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SendReminderDto } from './dto/send-reminder.dto';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';
import { normalizeJordanPhoneForWhatsapp } from '../../common/validators/phone.validator';

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
    if (!dto.installmentId && !dto.debtId) {
      throw new BadRequestException('Either installmentId or debtId is required');
    }

    const ownerObjectId = new Types.ObjectId(ownerUserId);
    let installment: InstallmentDocument | null = null;

    if (dto.installmentId) {
      installment = await this.installmentModel.findOne({
        _id: dto.installmentId,
        ownerUserId: ownerObjectId,
      });
    } else if (dto.debtId) {
      installment = await this.installmentModel
        .findOne({
          debtId: new Types.ObjectId(dto.debtId),
          ownerUserId: ownerObjectId,
          status: { $ne: 'paid' },
        })
        .sort({ dueDate: 1 })
        .exec();
    }

    if (!installment) throw new NotFoundException('Installment not found');

    const debt = await this.debtModel.findOne({
      _id: installment.debtId,
      ownerUserId: ownerObjectId,
    });
    if (!debt) throw new NotFoundException('Debt not found');

    const customer = await this.customerModel.findOne({
      _id: debt.customerId,
      ownerUserId: ownerObjectId,
    });

    const defaultMessage = this.buildCustomerReminderMessage(
      customer?.name ?? 'العميل',
      Number(installment.amount ?? 0),
      installment.dueDate,
    );
    const reminderMessage = dto.message?.trim() ? dto.message.trim() : defaultMessage;

    if (dto.channel === 'whatsapp') {
      if (!customer?.phone) {
        throw new BadRequestException({
          message: 'Customer phone is required to send WhatsApp reminder',
          messageKey: 'errors.reminders.phoneRequired',
        });
      }

      const whatsappLink = this.buildWhatsappLink(customer.phone, reminderMessage);
      const reminder = await this.reminderModel.create({
        ownerUserId: ownerObjectId,
        channel: dto.channel,
        status: 'sent',
        installmentId: installment._id,
        debtId: debt._id,
        customerId: customer?._id,
        sentAt: new Date(),
        payload: {
          message: reminderMessage,
          whatsappLink,
          mode: 'manual_open',
        },
      });

      return {
        id: reminder._id.toString(),
        status: reminder.status,
        channel: reminder.channel,
        sentAt: reminder.sentAt,
        whatsappLink,
      };
    }

    if (!customer?.email) {
      throw new BadRequestException({
        message: 'Customer email is required to send email reminder',
        messageKey: 'errors.reminders.emailRequired',
      });
    }

    const reminder = await this.reminderModel.create({
      ownerUserId: ownerObjectId,
      channel: dto.channel,
      status: 'queued',
      installmentId: installment._id,
      debtId: debt._id,
      customerId: customer?._id,
      payload: {
        message: reminderMessage,
      },
    });

    try {
      await this.sendCustomerReminderEmail({
        to: customer.email,
        customerName: customer.name ?? 'العميل',
        amount: Number(installment.amount ?? 0),
        dueDate: installment.dueDate,
        customMessage: reminderMessage,
      });

      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();

      return {
        id: reminder._id.toString(),
        status: reminder.status,
        channel: reminder.channel,
        sentAt: reminder.sentAt,
      };
    } catch (error: any) {
      reminder.status = 'failed';
      reminder.error = error?.message ?? String(error);
      await reminder.save();
      const message = reminder.error ?? '';
      const lower = typeof message === 'string' ? message.toLowerCase() : '';
      const isSmtpMissing =
        lower.includes('smtp') && (lower.includes('missing') || lower.includes('required') || lower.includes('credentials'));
      throw new BadRequestException({
        message,
        messageKey: isSmtpMissing ? 'errors.reminders.smtpMissing' : 'errors.reminders.emailSendFailed',
      });
    }
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
    try {
      const whatsappLink = this.buildWhatsappLink(input.settings.customWhatsappNumber, input.message);
      await this.reminderModel.create({
        ownerUserId: new Types.ObjectId(input.ownerUserId),
        channel: 'whatsapp',
        status: 'sent',
        installmentId: input.installmentId,
        debtId: input.debtId,
        customerId: input.customerId,
        sentAt: new Date(),
        payload: { kind: input.channelKind, message: input.message, whatsappLink, mode: 'manual_open' },
      });
    } catch (err: any) {
      this.logger.warn(`WhatsApp reminder failed: ${err?.message ?? String(err)}`);
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
      await this.sendEmailViaSmtp({
        to: input.ownerEmail,
        subject: 'SADAD Notification',
        html: `<p>${input.message.replace(/\n/g, '<br/>')}</p>`,
      });

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

  private buildCustomerReminderMessage(customerName: string, amount: number, dueDate: Date) {
    return `مرحباً ${customerName}،\nنذكرك بوجود قسط مستحق بقيمة ${amount} دينار بتاريخ ${this.formatDate(dueDate)}.\nيرجى الدفع 🙏`;
  }

  private formatDate(value: Date) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  }

  private buildWhatsappLink(phone: string, message: string) {
    const normalizedPhone = normalizeJordanPhoneForWhatsapp(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Customer phone is invalid');
    }
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  }

  private createSmtpTransport() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const secure = String(this.configService.get<string>('SMTP_SECURE') ?? 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      throw new BadRequestException({
        message: 'SMTP credentials missing (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)',
        messageKey: 'errors.reminders.smtpMissing',
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  private async sendEmailViaSmtp(input: { to: string; subject: string; html: string }) {
    const from = this.configService.get<string>('SMTP_FROM') ?? this.configService.get<string>('RESEND_FROM_EMAIL');
    if (!from) {
      throw new Error('SMTP_FROM is required');
    }

    const transporter = this.createSmtpTransport();
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }

  private async sendCustomerReminderEmail(input: {
    to: string;
    customerName: string;
    amount: number;
    dueDate: Date;
    customMessage: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <p>مرحباً ${input.customerName}،</p>
        <p>نذكرك بوجود قسط مستحق بقيمة <strong>${input.amount} دينار</strong> بتاريخ <strong>${this.formatDate(input.dueDate)}</strong>.</p>
        <p>يرجى الدفع 🙏</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;" />
        <p style="font-size: 12px; color: #64748b;">${input.customMessage.replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    await this.sendEmailViaSmtp({
      to: input.to,
      subject: 'تذكير قسط - SADAD',
      html,
    });
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
          customerEmail: customer?.email ?? null,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.status,
        };
      }),
    };
  }
}
