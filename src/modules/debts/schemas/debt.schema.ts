import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DebtDocument = Debt & Document;

export type DebtPlanType = 'one_time' | 'installments';
export type DebtStatus = 'active' | 'paid' | 'late' | 'bad';

@Schema({ timestamps: true })
export class Debt {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true, enum: ['invoice', 'loan', 'other'], default: 'invoice', index: true })
  type: string;

  @Prop({ required: true })
  principalAmount: number;

  @Prop({ required: true, default: 'JOD' })
  currency: string;

  @Prop({ required: true, enum: ['one_time', 'installments'] })
  planType: DebtPlanType;

  @Prop({ required: false })
  dueDate?: Date;

  @Prop({ required: false, trim: true })
  category?: string;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ required: true, enum: ['active', 'paid', 'late', 'bad'], default: 'active', index: true })
  status: DebtStatus;

  @Prop({ required: true, default: false })
  hasGuarantor: boolean;
}

export const DebtSchema = SchemaFactory.createForClass(Debt);
DebtSchema.index({ ownerUserId: 1, customerId: 1, createdAt: -1 });
