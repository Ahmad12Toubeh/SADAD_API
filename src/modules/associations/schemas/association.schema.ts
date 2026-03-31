import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssociationDocument = Association & Document;

@Schema({ timestamps: true })
export class Association {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerUserId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 2 })
  members: number;

  @Prop({ required: true, min: 1 })
  monthlyAmount: number;

  @Prop({ required: true, min: 1 })
  myTurn: number;

  @Prop({ required: true, min: 0, default: 0 })
  currentMonth: number;

  @Prop({ required: true, default: 'active' })
  status: string;
}

export const AssociationSchema = SchemaFactory.createForClass(Association);
AssociationSchema.index({ ownerUserId: 1, createdAt: -1 });

