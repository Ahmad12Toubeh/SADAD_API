import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  debtId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  installmentId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paidAt: Date;

  @Prop({ required: true, default: 'cash' })
  method: string;

  @Prop({ required: false, trim: true })
  note?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ ownerUserId: 1, installmentId: 1, paidAt: -1 });

