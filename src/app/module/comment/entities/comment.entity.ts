import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true })
  blog: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null })
  parentComment?: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
