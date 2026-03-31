import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GuarantorDocument = Guarantor & Document;
export type GuarantorStatus = 'inactive' | 'active';

@Schema({ timestamps: true })
export class Guarantor {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true, unique: true })
  debtId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ required: true, enum: ['inactive', 'active'], default: 'inactive', index: true })
  status: GuarantorStatus;

  @Prop({ required: false })
  activatedAt?: Date;
}

export const GuarantorSchema = SchemaFactory.createForClass(Guarantor);
GuarantorSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });

