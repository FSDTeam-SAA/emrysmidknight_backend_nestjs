import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  })
  plan: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSubscriptionSchema =
  SchemaFactory.createForClass(UserSubscription);
