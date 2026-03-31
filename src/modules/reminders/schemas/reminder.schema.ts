import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;
export type ReminderChannel = 'whatsapp' | 'sms' | 'email';
export type ReminderStatus = 'queued' | 'sent' | 'failed';

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  debtId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  installmentId?: Types.ObjectId;

  @Prop({ required: true, enum: ['whatsapp', 'sms', 'email'] })
  channel: ReminderChannel;

  @Prop({ required: true, enum: ['queued', 'sent', 'failed'], default: 'queued', index: true })
  status: ReminderStatus;

  @Prop({ type: Object, required: false })
  payload?: Record<string, any>;

  @Prop({ required: false })
  sentAt?: Date;

  @Prop({ required: false, trim: true })
  error?: string;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
ReminderSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });

