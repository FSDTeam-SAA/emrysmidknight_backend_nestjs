import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type SubscriberDocument = HydratedDocument<Subscriber>;

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: mongoose.Schema.Types.ObjectId;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User' })
  subscribers: mongoose.Schema.Types.ObjectId[];
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
