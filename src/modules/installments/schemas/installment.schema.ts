import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InstallmentDocument = Installment & Document;
export type InstallmentStatus = 'pending' | 'paid' | 'late';

@Schema({ timestamps: true })
export class Installment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  debtId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true, enum: ['pending', 'paid', 'late'], default: 'pending', index: true })
  status: InstallmentStatus;

  @Prop({ required: false })
  paidAt?: Date;
}

export const InstallmentSchema = SchemaFactory.createForClass(Installment);
InstallmentSchema.index({ ownerUserId: 1, debtId: 1, dueDate: 1 });

