import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionNotificationDocument = SubscriptionNotification & Document;

export type SubscriptionNotificationKind = 'trial_expiring' | 'subscription_expiring';
export type SubscriptionNotificationStage = 'trial' | 'active';

@Schema({ timestamps: true })
export class SubscriptionNotification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: true, enum: ['trial_expiring', 'subscription_expiring'] })
  kind: SubscriptionNotificationKind;

  @Prop({ required: true, enum: ['trial', 'active'] })
  targetStage: SubscriptionNotificationStage;

  @Prop({ required: true })
  targetKey: string;

  @Prop({ required: true })
  targetDate: Date;

  @Prop({ required: true })
  daysRemainingSnapshot: number;

  @Prop({ trim: true })
  subscriptionPlanLabel?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const SubscriptionNotificationSchema = SchemaFactory.createForClass(SubscriptionNotification);
SubscriptionNotificationSchema.index({ ownerUserId: 1, targetKey: 1 }, { unique: true });
