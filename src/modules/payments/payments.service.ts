import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
  ) {}

  async createForInstallment(ownerUserId: string, installmentId: string, dto: CreatePaymentDto) {
    const installment = await this.installmentModel.findOne({
      _id: installmentId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!installment) throw new NotFoundException('Installment not found');

    if (installment.status === 'paid') {
      throw new BadRequestException('Installment already paid');
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const [paidAgg] = await this.paymentModel
      .aggregate([
        {
          $match: {
            ownerUserId: new Types.ObjectId(ownerUserId),
            installmentId: installment._id,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    const alreadyPaid = paidAgg?.total ?? 0;
    const remaining = Math.max(0, installment.amount - alreadyPaid);
    if (remaining <= 0) {
      throw new BadRequestException('Installment already paid');
    }

    const amount = dto.amount ?? remaining;
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (amount > remaining) {
      throw new BadRequestException('Payment amount exceeds remaining installment balance');
    }

    const payment = await this.paymentModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      debtId: installment.debtId,
      installmentId: installment._id,
      amount,
      method: dto.method ?? 'cash',
      note: dto.note,
      paidAt,
    });

    const totalAfterPayment = alreadyPaid + amount;
    if (totalAfterPayment >= installment.amount) {
      installment.status = 'paid';
      installment.paidAt = paidAt;
    }
    await installment.save();

    await this.recomputeDebtStatus(ownerUserId, installment.debtId.toString());

    return {
      id: payment._id.toString(),
      installmentId: payment.installmentId.toString(),
      debtId: payment.debtId.toString(),
      amount: payment.amount,
      method: payment.method,
      note: payment.note ?? null,
      paidAt: payment.paidAt,
      remainingAmount: Math.max(0, installment.amount - totalAfterPayment),
      createdAt: (payment as any).createdAt,
    };
  }

  private async recomputeDebtStatus(ownerUserId: string, debtId: string) {
    const debt = await this.debtModel.findOne({
      _id: debtId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!debt) return;

    const installments = await this.installmentModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), debtId: debt._id })
      .exec();

    const allPaid = installments.length > 0 && installments.every((i) => i.status === 'paid');
    if (allPaid) {
      debt.status = 'paid';
      await debt.save();
      return;
    }

    // Keep it simple for v1: if any installment is late => debt late, else active.
    const anyLate = installments.some((i) => i.status === 'late');
    debt.status = anyLate ? 'late' : 'active';
    await debt.save();
  }
}

