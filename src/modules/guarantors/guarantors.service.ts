import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { Installment, InstallmentDocument } from '../installments/schemas/installment.schema';
import { Guarantor, GuarantorDocument } from './schemas/guarantor.schema';

@Injectable()
export class GuarantorsService {
  constructor(
    @InjectModel(Guarantor.name) private readonly guarantorModel: Model<GuarantorDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
  ) {}

  async upsertForDebt(
    ownerUserId: string,
    debtId: Types.ObjectId,
    input: { name: string; phone: string; notes?: string },
  ) {
    const doc = await this.guarantorModel.findOneAndUpdate(
      { ownerUserId: new Types.ObjectId(ownerUserId), debtId },
      {
        $set: {
          name: input.name,
          phone: input.phone,
          notes: input.notes,
        },
        $setOnInsert: { status: 'inactive' },
      },
      { new: true, upsert: true },
    );
    return this.toPublic(doc);
  }

  async activateIfLate(ownerUserId: string, debtId: string) {
    const debt = await this.debtModel.findOne({
      _id: debtId,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!debt) throw new NotFoundException('Debt not found');

    const now = new Date();
    const hasLate = await this.installmentModel.exists({
      ownerUserId: new Types.ObjectId(ownerUserId),
      debtId: debt._id,
      status: { $ne: 'paid' },
      dueDate: { $lt: now },
    });

    if (!hasLate) {
      throw new BadRequestException('No late installments; guarantor activation not allowed');
    }

    const guarantor = await this.guarantorModel.findOne({
      ownerUserId: new Types.ObjectId(ownerUserId),
      debtId: debt._id,
    });
    if (!guarantor) throw new NotFoundException('Guarantor not found for this debt');

    guarantor.status = 'active';
    guarantor.activatedAt = new Date();
    await guarantor.save();

    debt.hasGuarantor = true;
    await debt.save();

    return this.toPublic(guarantor);
  }

  async findOne(ownerUserId: string, debtId: string) {
    const doc = await this.guarantorModel.findOne({
      ownerUserId: new Types.ObjectId(ownerUserId),
      debtId: new Types.ObjectId(debtId),
    });
    if (!doc) throw new NotFoundException('Guarantor not found');
    return this.toPublic(doc);
  }

  async list(ownerUserId: string, search?: string) {
    const filter: any = { ownerUserId: new Types.ObjectId(ownerUserId) };
    if (search?.trim()) {
      filter.$or = [
        { name: new RegExp(search.trim(), "i") },
        { phone: new RegExp(search.trim(), "i") },
      ];
    }

    const items = await this.guarantorModel
      .find(filter)
      .populate("debtId")
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    return {
      items: items.map((g: any) => ({
        ...this.toPublic(g),
        totalDebt: g.debtId?.principalAmount || 0,
        debtStatus: g.debtId?.status || "unknown",
      })),
    };
  }

  private toPublic(doc: GuarantorDocument | Guarantor) {
    const obj = (doc as any).toObject ? (doc as any).toObject() : (doc as any);
    return {
      id: obj._id?.toString?.() ?? obj.id,
      debtId: obj.debtId?.toString?.() ?? obj.debtId,
      name: obj.name,
      phone: obj.phone,
      notes: obj.notes ?? null,
      status: obj.status,
      activatedAt: obj.activatedAt ?? null,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

