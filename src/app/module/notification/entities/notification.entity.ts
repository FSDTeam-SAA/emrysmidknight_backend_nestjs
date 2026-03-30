import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  NEW_CHAPTER = 'new_chapter',
  AUTHOR_POST = 'author_post',
  PREMIUM_CONTENT = 'premium_content',
  RECOMMENDED_STORY = 'recommended_story',
  AUTHOR_FOLLOW_UPDATE = 'author_follow_update',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  sender?: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' })
  blog?: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
