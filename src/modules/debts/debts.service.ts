import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../customers/customers.service';
import { GuarantorsService } from '../guarantors/guarantors.service';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { Debt, DebtDocument } from './schemas/debt.schema';

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

@Injectable()
export class DebtsService {
  constructor(
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    private readonly customersService: CustomersService,
    private readonly guarantorsService: GuarantorsService,
  ) {}

  async create(ownerUserId: string, dto: CreateDebtDto) {
    // Ensure customer exists and belongs to user
    await this.customersService.findOne(ownerUserId, dto.customerId);

    if (dto.planType === 'installments' && !dto.installmentsPlan) {
      throw new BadRequestException('installmentsPlan is required for installments debts');
    }

    const hasGuarantor = Boolean(dto.hasGuarantor ?? dto.guarantor);

    const debt = await this.debtModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      customerId: new Types.ObjectId(dto.customerId),
      principalAmount: dto.principalAmount,
      currency: dto.currency ?? 'SAR',
      planType: dto.planType,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      category: dto.category,
      notes: dto.notes,
      hasGuarantor,
      status: 'active',
    });

    const installments = await this.generateInstallments(ownerUserId, debt, dto);

    if (dto.guarantor) {
      await this.guarantorsService.upsertForDebt(ownerUserId, debt._id, dto.guarantor);
    }

    return {
      debt: this.toPublicDebt(debt),
      installments: installments.map((i) => this.toPublicInstallment(i)),
    };
  }

  async findOne(ownerUserId: string, id: string) {
    const debt = await this.debtModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!debt) throw new NotFoundException('Debt not found');

    const installments = await this.installmentModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), debtId: debt._id })
      .sort({ dueDate: 1 })
      .exec();

    return {
      debt: this.toPublicDebt(debt),
      installments: installments.map((i) => this.toPublicInstallment(i)),
    };
  }

  async update(ownerUserId: string, id: string, dto: UpdateDebtDto) {
    const debt = await this.debtModel.findOneAndUpdate(
      { _id: id, ownerUserId: new Types.ObjectId(ownerUserId) },
      { $set: dto },
      { new: true },
    );
    if (!debt) throw new NotFoundException('Debt not found');
    return this.toPublicDebt(debt);
  }

  async listByCustomer(ownerUserId: string, customerId: string) {
    const debts = await this.debtModel
      .find({
        ownerUserId: new Types.ObjectId(ownerUserId),
        customerId: new Types.ObjectId(customerId),
      })
      .sort({ createdAt: -1 })
      .exec();
    return { items: debts.map((d) => this.toPublicDebt(d)) };
  }

  async listInstallments(ownerUserId: string, debtId: string) {
    const items = await this.installmentModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId), debtId: new Types.ObjectId(debtId) })
      .sort({ dueDate: 1 })
      .exec();
    return { items: items.map((i) => this.toPublicInstallment(i)) };
  }

  private async generateInstallments(ownerUserId: string, debt: DebtDocument, dto: CreateDebtDto) {
    const startDue = dto.dueDate ? new Date(dto.dueDate) : new Date();

    let count = 1;
    let period: 'monthly' | 'weekly' = 'monthly';
    if (dto.planType === 'installments') {
      count = dto.installmentsPlan!.count;
      period = dto.installmentsPlan!.period;
    }

    const base = Math.floor((dto.principalAmount / count) * 100) / 100;
    const installments: Array<Partial<Installment>> = [];
    let allocated = 0;

    for (let i = 0; i < count; i++) {
      const amount = i === count - 1 ? Number((dto.principalAmount - allocated).toFixed(2)) : base;
      allocated = Number((allocated + amount).toFixed(2));

      const dueDate =
        period === 'weekly' ? addWeeks(startDue, i) : addMonths(startDue, i);

      installments.push({
        ownerUserId: new Types.ObjectId(ownerUserId),
        debtId: debt._id,
        amount,
        dueDate,
        status: 'pending',
      });
    }

    return this.installmentModel.insertMany(installments);
  }

  private toPublicDebt(doc: DebtDocument | Debt) {
    const obj = (doc as any).toObject ? (doc as any).toObject() : (doc as any);
    return {
      id: obj._id?.toString?.() ?? obj.id,
      customerId: obj.customerId?.toString?.() ?? obj.customerId,
      principalAmount: obj.principalAmount,
      currency: obj.currency,
      planType: obj.planType,
      dueDate: obj.dueDate ?? null,
      category: obj.category ?? null,
      notes: obj.notes ?? null,
      status: obj.status,
      hasGuarantor: obj.hasGuarantor,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  private toPublicInstallment(doc: any) {
    const obj = doc?.toObject ? doc.toObject() : doc;
    return {
      id: obj._id?.toString?.() ?? obj.id,
      debtId: obj.debtId?.toString?.() ?? obj.debtId,
      amount: obj.amount,
      dueDate: obj.dueDate,
      status: obj.status,
      paidAt: obj.paidAt ?? null,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

