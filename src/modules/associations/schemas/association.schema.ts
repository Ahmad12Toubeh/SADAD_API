import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssociationDocument = Association & Document;

@Schema({ timestamps: true })
export class Association {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 2 })
  members: number;

  @Prop({ required: true, min: 1 })
  monthlyAmount: number;

  @Prop({ required: false, min: 1 })
  myTurn?: number;

  @Prop({ required: true, min: 0, default: 0 })
  currentMonth: number;

  @Prop({ required: true, default: 'active' })
  status: string;

  @Prop({ required: true, default: 'rotating' })
  associationKind: 'rotating' | 'family';

  @Prop({ required: true, default: false })
  lockOrder: boolean;

  @Prop({ required: false })
  fundGuarantorMemberId?: string;

  @Prop({
    type: [
      {
        id: { type: String },
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        turnOrder: { type: Number },
        isPaid: { type: Boolean },
        isReceiver: { type: Boolean },
        paidAt: { type: Date },
      },
    ],
    default: [],
  })
  membersList: Array<{
    id?: string;
    name?: string;
    phone?: string;
    turnOrder?: number;
    isPaid?: boolean;
    isReceiver?: boolean;
    paidAt?: Date;
  }>;

  @Prop({
    type: [
      {
        month: { type: Number },
        receiverId: { type: String },
        receiverName: { type: String },
        paidMemberIds: { type: [String] },
        paidCount: { type: Number },
        totalCollected: { type: Number },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  cycleHistory: Array<{
    month: number;
    receiverId?: string;
    receiverName?: string;
    paidMemberIds?: string[];
    paidCount?: number;
    totalCollected?: number;
    createdAt?: Date;
  }>;

  @Prop({ required: true, default: 0 })
  fundBalance: number;

  @Prop({
    type: [
      {
        id: { type: String },
        type: { type: String, enum: ['in', 'out'] },
        amount: { type: Number },
        note: { type: String, trim: true },
        memberId: { type: String },
        status: { type: String, enum: ['pending', 'approved'], default: 'approved' },
        approvals: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  fundTransactions: Array<{
    id?: string;
    type: 'in' | 'out';
    amount: number;
    note?: string;
    memberId?: string;
    status?: 'pending' | 'approved';
    approvals?: string[];
    createdAt?: Date;
  }>;

  @Prop({
    type: [
      {
        id: { type: String },
        memberId: { type: String },
        memberName: { type: String },
        amount: { type: Number },
        note: { type: String, trim: true },
        month: { type: Number },
        paidAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  paymentLogs: Array<{
    id?: string;
    memberId?: string;
    memberName?: string;
    amount?: number;
    note?: string;
    month?: number;
    paidAt?: Date;
  }>;
}

export const AssociationSchema = SchemaFactory.createForClass(Association);
AssociationSchema.index({ ownerUserId: 1, createdAt: -1 });
