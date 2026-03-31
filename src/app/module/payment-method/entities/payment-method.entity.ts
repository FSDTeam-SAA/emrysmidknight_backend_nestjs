import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type PaymentMethodDocument = HydratedDocument<PaymentMethod>;

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
  @Prop()
  cardBrand: string;

  @Prop({ required: true })
  cardNumber: string;

  @Prop({ required: true })
  expiryMonth: number;

  @Prop({ required: true })
  expiryYear: number;

  @Prop()
  cardHolderName: string;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);
