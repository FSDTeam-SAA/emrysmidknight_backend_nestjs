import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  // optional (single blog purchase)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' })
  blog?: Types.ObjectId;

  // optional (subscription purchase)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' })
  plan?: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  authorAmount!: number;

  @Prop({ required: true })
  adminAmount!: number;

  @Prop({ enum: ['blog', 'subscription'], required: true })
  paymentType!: string;

  @Prop({
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  })
  status!: string;

  @Prop()
  stripeSessionId!: string;

  @Prop()
  stripePaymentIntentId!: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
