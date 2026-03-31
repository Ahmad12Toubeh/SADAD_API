import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationSettingsDocument = NotificationSettings & Document;

@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: true, default: true })
  remindOnDelay: boolean;

  @Prop({ required: true, default: true })
  remindBeforeDue: boolean;

  @Prop({ required: true, default: false })
  weeklySummary: boolean;

  @Prop({ required: true, default: true })
  whatsappEnabled: boolean;

  @Prop({ required: false, trim: true })
  customWhatsappNumber?: string;
}

export const NotificationSettingsSchema =
  SchemaFactory.createForClass(NotificationSettings);

