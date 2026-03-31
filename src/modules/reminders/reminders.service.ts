import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { SendReminderDto } from './dto/send-reminder.dto';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

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

    return {
      items: items.map((r) => ({
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

