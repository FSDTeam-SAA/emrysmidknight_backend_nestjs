import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type NotificationSettingsDocument =
  HydratedDocument<NotificationSettings>;

@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: Types.ObjectId;

  @Prop({ default: true })
  newChapterUpdates: boolean;

  @Prop({ default: true })
  authorPosts: boolean;

  @Prop({ default: true })
  premiumContentAlerts: boolean;

  @Prop({ default: true })
  recommendedStories: boolean;

  @Prop({ default: true })
  authorYouFollowUpdates: boolean;

  @Prop({ default: true })
  paymentSuccessConfirmation: boolean;

  @Prop({ default: true })
  paymentFailedAlert: boolean;

  @Prop({ default: false })
  emailNotifications: boolean;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(
  NotificationSettings,
);