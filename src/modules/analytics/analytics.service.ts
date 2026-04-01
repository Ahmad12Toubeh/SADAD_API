import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUtc(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async summary(ownerUserId: string) {
    const owner = new Types.ObjectId(ownerUserId);
    const now = new Date();
    const monthStart = startOfMonth(now);
    const nextMonthStart = addMonthsUtc(monthStart, 1);

    const [
      activeDebtAgg,
      collectedThisMonthAgg,
      newDebtsThisMonthAgg,
      overdueAgg,
      activeCustomers,
      statusAgg,
      installmentsAgg,
    ] = await Promise.all([
      this.debtModel
        .aggregate([
          { $match: { ownerUserId: owner, status: { $in: ['active', 'late', 'bad'] } } },
          { $group: { _id: null, total: { $sum: '$principalAmount' }, count: { $sum: 1 } } },
        ])
        .exec(),
      this.paymentModel
        .aggregate([
          { $match: { ownerUserId: owner, paidAt: { $gte: monthStart, $lt: nextMonthStart } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.debtModel
        .aggregate([
          { $match: { ownerUserId: owner, createdAt: { $gte: monthStart, $lt: nextMonthStart } } },
          { $group: { _id: null, total: { $sum: '$principalAmount' } } },
        ])
        .exec(),
      this.installmentModel
        .aggregate([
          {
            $match: {
              ownerUserId: owner,
              status: { $ne: 'paid' },
              dueDate: { $lt: now },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.customerModel.countDocuments({ ownerUserId: owner }).exec(),
      this.debtModel
        .aggregate([
          { $match: { ownerUserId: owner } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.installmentModel
        .aggregate([
          { $match: { ownerUserId: owner } },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            },
          },
        ])
        .exec(),
    ]);

    const activeDebtTotal = activeDebtAgg[0]?.total ?? 0;
    const activeDebtCount = activeDebtAgg[0]?.count ?? 0;
    const avgDebtAmount = activeDebtCount > 0 ? activeDebtTotal / activeDebtCount : 0;

    const statusDistribution: Record<string, number> = {
      paid: 0,
      active: 0,
      late: 0,
      bad: 0,
    };
    for (const row of statusAgg ?? []) {
      if (row?._id) statusDistribution[row._id] = row.count ?? 0;
    }

    const newDebtsThisMonth = newDebtsThisMonthAgg[0]?.total ?? 0;
    const collectedThisMonth = collectedThisMonthAgg[0]?.total ?? 0;
    const collectionRate = newDebtsThisMonth > 0 ? (collectedThisMonth / newDebtsThisMonth) * 100 : 0;

    return {
      totalActiveDebt: activeDebtTotal,
      activeDebtCount,
      collectedThisMonth,
      newDebtsThisMonth,
      overdueAmount: overdueAgg[0]?.total ?? 0,
      activeCustomers,
      avgDebtAmount,
      collectionRate,
      statusDistribution,
      currency: 'SAR',
    };
  }

  async monthly(ownerUserId: string, months = 6) {
    const owner = new Types.ObjectId(ownerUserId);
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const from = addMonthsUtc(thisMonthStart, -(months - 1));
    const to = addMonthsUtc(thisMonthStart, 1);

    const [debts, collected] = await Promise.all([
      this.debtModel
        .aggregate([
          { $match: { ownerUserId: owner, createdAt: { $gte: from, $lt: to } } },
          {
            $group: {
              _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
              debts: { $sum: '$principalAmount' },
            },
          },
        ])
        .exec(),
      this.paymentModel
        .aggregate([
          { $match: { ownerUserId: owner, paidAt: { $gte: from, $lt: to } } },
          {
            $group: {
              _id: { y: { $year: '$paidAt' }, m: { $month: '$paidAt' } },
              collected: { $sum: '$amount' },
            },
          },
        ])
        .exec(),
    ]);

    const map = new Map<string, { debts: number; collected: number }>();
    for (const d of debts) map.set(`${d._id.y}-${d._id.m}`, { debts: d.debts ?? 0, collected: 0 });
    for (const c of collected) {
      const key = `${c._id.y}-${c._id.m}`;
      const prev = map.get(key) ?? { debts: 0, collected: 0 };
      map.set(key, { ...prev, collected: c.collected ?? 0 });
    }

    const out: Array<{ year: number; month: number; debts: number; collected: number }> = [];
    for (let i = 0; i < months; i++) {
      const d = addMonthsUtc(from, i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const key = `${y}-${m}`;
      const row = map.get(key) ?? { debts: 0, collected: 0 };
      out.push({ year: y, month: m, debts: row.debts, collected: row.collected });
    }

    return { items: out, currency: 'SAR' };
  }
}
