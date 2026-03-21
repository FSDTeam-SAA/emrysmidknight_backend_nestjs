import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  author: mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ enum: ['monthly', 'yearly'], required: true })
  duration: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Blog',
    default: [],
  })
  blogs: mongoose.Types.ObjectId[];
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
