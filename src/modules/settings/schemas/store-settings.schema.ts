import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StoreSettingsDocument = StoreSettings & Document;

@Schema({ timestamps: true })
export class StoreSettings {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: false, trim: true })
  storeName?: string;

  @Prop({ required: false, trim: true })
  businessType?: string;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, trim: true })
  cr?: string;

  @Prop({ required: true, default: 'SAR' })
  currency: string;
}

export const StoreSettingsSchema = SchemaFactory.createForClass(StoreSettings);

