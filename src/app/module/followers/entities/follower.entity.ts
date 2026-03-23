import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type FollowerDocument = HydratedDocument<Follower>;

@Schema({ timestamps: true })
export class Follower {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  followers: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;
}

export const FollowerSchema = SchemaFactory.createForClass(Follower);
