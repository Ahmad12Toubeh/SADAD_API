import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

export type CustomerType = 'individual' | 'company';
export type CustomerStatus = 'regular' | 'late' | 'defaulting';

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: true, enum: ['individual', 'company'] })
  type: CustomerType;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: false, trim: true })
  email?: string;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, trim: true })
  cr?: string;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ required: true, enum: ['regular', 'late', 'defaulting'], default: 'regular' })
  status: CustomerStatus;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ ownerUserId: 1, phone: 1 }, { unique: false });
CustomerSchema.index({ ownerUserId: 1, name: 'text', phone: 'text', email: 'text' });

