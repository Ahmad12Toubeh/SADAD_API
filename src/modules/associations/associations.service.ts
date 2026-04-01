import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssociationDto } from './dto/create-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';
import { Association, AssociationDocument } from './schemas/association.schema';

@Injectable()
export class AssociationsService {
  constructor(
    @InjectModel(Association.name)
    private readonly associationModel: Model<AssociationDocument>,
  ) {}

  async create(ownerUserId: string, dto: CreateAssociationDto) {
    const membersListRaw = dto.membersList ?? [];
    const associationKind = dto.associationKind ?? 'rotating';
    const membersList = this.normalizeMembersList(membersListRaw, dto.members, associationKind);
    const members = membersList.length > 0 ? membersList.length : dto.members;
    const doc = await this.associationModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      ...dto,
      members,
      membersList,
      currentMonth: 0,
      status: 'active',
      associationKind,
      lockOrder: false,
      cycleHistory: [],
      fundBalance: 0,
      fundTransactions: [],
      paymentLogs: [],
    });
    return this.toPublic(doc);
  }

  async list(ownerUserId: string) {
    const items = await this.associationModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
    return { items: items.map((i) => this.toPublic(i)) };
  }

  async get(ownerUserId: string, id: string) {
    const doc = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');
    return this.toPublic(doc);
  }

  async update(ownerUserId: string, id: string, dto: UpdateAssociationDto) {
    const current = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!current) throw new NotFoundException('Association not found');

    const update: any = { ...dto };
    const kind = dto.associationKind ?? current.associationKind ?? 'rotating';
    if (dto.membersList) {
      const normalized = this.normalizeMembersList(dto.membersList as any, dto.members ?? current.members, kind);
      const locked = Boolean(current.lockOrder);
      if (locked) {
        const byId = new Map((current.membersList ?? []).map((m: any) => [m.id, m.turnOrder]));
        update.membersList = normalized.map((m) => ({
          ...m,
          turnOrder: byId.get(m.id) ?? m.turnOrder,
        }));
      } else {
        update.membersList = normalized;
      }
      update.members = update.membersList.length;
    } else if (typeof dto.members === 'number') {
      update.members = dto.members;
    }
    if (kind === 'family' && update.membersList) {
      update.membersList = update.membersList.map((m: any) => ({ ...m, isReceiver: false }));
    }

    // Record newly paid members into payment logs
    if (update.membersList) {
      const prevById = new Map((current.membersList ?? []).map((m: any) => [m.id, m]));
      const now = new Date();
      const month = (current.currentMonth ?? 0) + 1;
      const logs = current.paymentLogs ?? [];
      const newLogs: any[] = [];
      for (const m of update.membersList) {
        const prev = prevById.get(m.id);
        const wasPaid = Boolean(prev?.isPaid);
        const isPaid = Boolean(m.isPaid);
        if (!wasPaid && isPaid) {
          newLogs.push({
            id: new Types.ObjectId().toString(),
            memberId: m.id,
            memberName: m.name,
            amount: Number(current.monthlyAmount ?? 0),
            note: undefined,
            month,
            paidAt: now,
          });
          m.paidAt = now;
        }
        if (!isPaid) {
          m.paidAt = undefined;
        }
      }
      if (newLogs.length > 0) {
        update.paymentLogs = [...logs, ...newLogs];
      }
    }
    const doc = await this.associationModel.findOneAndUpdate(
      { _id: id, ownerUserId: new Types.ObjectId(ownerUserId) },
      { $set: update },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Association not found');
    return this.toPublic(doc);
  }

  async closeMonth(ownerUserId: string, id: string) {
    const doc = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');

    const membersList = doc.membersList ?? [];
    const paidMembers = membersList.filter((m: any) => m.isPaid);
    const paidMemberIds = paidMembers.map((m: any) => m.id).filter(Boolean);
    const paidCount = paidMembers.length;
    const totalCollected = paidCount * Number(doc.monthlyAmount ?? 0);

    const receiver = membersList.find((m: any) => m.isReceiver);
    const receiverId = receiver?.id;
    const receiverName = receiver?.name;

    doc.cycleHistory = [
      ...(doc.cycleHistory ?? []),
      {
        month: (doc.currentMonth ?? 0) + 1,
        receiverId,
        receiverName,
        paidMemberIds,
        paidCount,
        totalCollected,
        createdAt: new Date(),
      },
    ];

    if (doc.associationKind === 'family') {
      doc.fundBalance = Number(doc.fundBalance ?? 0) + totalCollected;
      doc.fundTransactions = [
        ...(doc.fundTransactions ?? []),
        {
          id: new Types.ObjectId().toString(),
          type: 'in',
          amount: totalCollected,
          note: 'Monthly collection',
          createdAt: new Date(),
        },
      ];
    }

    // Reset paid flags
    doc.membersList = membersList.map((m: any) => ({ ...m, isPaid: false, paidAt: undefined }));

    // Auto-select next receiver for rotating associations
    if (doc.associationKind !== 'family') {
      const sorted = [...(doc.membersList ?? [])].sort((a: any, b: any) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
      const currentOrder = receiver?.turnOrder ?? null;
      let next = sorted[0];
      if (currentOrder != null && sorted.length > 0) {
        const idx = sorted.findIndex((m: any) => m.turnOrder === currentOrder);
        next = sorted[(idx + 1) % sorted.length] ?? sorted[0];
      } else if (sorted.length > 0) {
        const idx = (doc.currentMonth ?? 0) % sorted.length;
        next = sorted[idx];
      }
      doc.membersList = doc.membersList.map((m: any) => ({ ...m, isReceiver: m.id === next?.id }));
    } else {
      doc.membersList = doc.membersList.map((m: any) => ({ ...m, isReceiver: false }));
    }

    doc.currentMonth = (doc.currentMonth ?? 0) + 1;
    if (doc.currentMonth >= 1) doc.lockOrder = true;

    await doc.save();
    return this.toPublic(doc);
  }

  async addFundTransaction(
    ownerUserId: string,
    id: string,
    input: { type: 'in' | 'out'; amount: number; note?: string; memberId?: string },
  ) {
    const doc = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');

    const amt = Number(input.amount ?? 0);
    const isOut = input.type === 'out';
    const signed = isOut ? -Math.abs(amt) : Math.abs(amt);
    if (!isOut) {
      doc.fundBalance = Number(doc.fundBalance ?? 0) + signed;
    }
    doc.fundTransactions = [
      ...(doc.fundTransactions ?? []),
      {
        id: new Types.ObjectId().toString(),
        type: input.type,
        amount: Math.abs(amt),
        note: input.note,
        memberId: input.memberId,
        status: isOut ? 'pending' : 'approved',
        approvals: [],
        createdAt: new Date(),
      },
    ];
    await doc.save();
    return this.toPublic(doc);
  }

  async approveFundTransaction(ownerUserId: string, id: string, input: { transactionId: string; memberId: string }) {
    const doc = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');
    const tx = (doc.fundTransactions ?? []).find((t: any) => t.id === input.transactionId);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status === 'approved') return this.toPublic(doc);

    const approvals = new Set(tx.approvals ?? []);
    approvals.add(input.memberId);
    tx.approvals = Array.from(approvals);

    const guarantorRequired = doc.fundGuarantorMemberId;
    const hasGuarantor = !guarantorRequired || approvals.has(guarantorRequired);
    const approvedEnough = approvals.size >= 2 && hasGuarantor;
    if (approvedEnough) {
      tx.status = 'approved';
      doc.fundBalance = Number(doc.fundBalance ?? 0) - Math.abs(Number(tx.amount ?? 0));
    }
    await doc.save();
    return this.toPublic(doc);
  }

  async remove(ownerUserId: string, id: string) {
    const doc = await this.associationModel.findOneAndDelete({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');
    return { ok: true };
  }

  private toPublic(doc: any) {
    const obj = doc?.toObject ? doc.toObject() : doc;
    const totalValue = Number(obj.members ?? 0) * Number(obj.monthlyAmount ?? 0);
    return {
      id: obj._id?.toString?.() ?? obj.id,
      name: obj.name,
      members: obj.members,
      membersList: obj.membersList ?? [],
      monthlyAmount: obj.monthlyAmount,
      currentMonth: obj.currentMonth,
      status: obj.status,
      associationKind: obj.associationKind ?? 'rotating',
      lockOrder: Boolean(obj.lockOrder),
      cycleHistory: obj.cycleHistory ?? [],
      fundBalance: obj.fundBalance ?? 0,
      fundTransactions: obj.fundTransactions ?? [],
      fundGuarantorMemberId: obj.fundGuarantorMemberId ?? null,
      paymentLogs: obj.paymentLogs ?? [],
      totalValue,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  private normalizeMembersList(
    list: Array<{ id?: string; name?: string; phone?: string; turnOrder?: number; isPaid?: boolean; isReceiver?: boolean }>,
    membersCount?: number,
    associationKind: 'rotating' | 'family' = 'rotating',
  ) {
    const sorted = [...(list ?? [])].sort((a, b) => {
      const an = (a.name ?? '').toLowerCase();
      const bn = (b.name ?? '').toLowerCase();
      if (an && bn && an !== bn) return an.localeCompare(bn, 'ar');
      return (a.phone ?? '').localeCompare(b.phone ?? '');
    });
    const normalized = sorted.map((m, idx) => ({
      id: m.id || new Types.ObjectId().toString(),
      name: m.name?.trim?.() ?? '',
      phone: m.phone?.trim?.() ?? '',
      turnOrder: m.turnOrder ?? idx + 1,
      isPaid: Boolean(m.isPaid),
      isReceiver: associationKind === 'family' ? false : Boolean(m.isReceiver),
    }));
    if (normalized.length === 0 && membersCount && membersCount > 0) {
      return Array.from({ length: membersCount }).map((_, idx) => ({
        id: new Types.ObjectId().toString(),
        name: '',
        phone: '',
        turnOrder: idx + 1,
        isPaid: false,
        isReceiver: associationKind === 'family' ? false : false,
      }));
    }
    return normalized;
  }
}
