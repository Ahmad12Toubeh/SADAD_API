import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, select: false })
  passwordHash?: string;

  // Legacy field from early scaffold. Kept for backward compatibility/migration.
  @Prop({ required: false, select: false })
  password?: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, trim: true })
  avatarUrl?: string;

  @Prop({ required: false, trim: true })
  avatarPublicId?: string;

  @Prop({ default: 'user' }) // 'user' | 'admin'
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, default: Date.now })
  trialStartedAt: Date;

  @Prop({ required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
  trialEndsAt: Date;

  @Prop()
  subscriptionStartedAt?: Date;

  @Prop()
  subscriptionEndsAt?: Date;

  @Prop()
  subscriptionMonths?: number;

  @Prop({ trim: true })
  subscriptionPlanLabel?: string;

  @Prop({ trim: true })
  subscriptionActivatedBy?: string;

  @Prop({ trim: true })
  subscriptionNotes?: string;

  @Prop({ required: false, select: false })
  resetPasswordTokenHash?: string;

  @Prop({ required: false, select: false })
  resetPasswordTokenExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
