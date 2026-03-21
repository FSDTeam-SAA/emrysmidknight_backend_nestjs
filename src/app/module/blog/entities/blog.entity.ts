import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type BlogDocument = HydratedDocument<Blog>;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ type: [String] })
  image: string[];

  @Prop({ type: [String] })
  audio: string[];

  @Prop()
  link: string;

  @Prop({ type: [String] })
  attachment: string[];

  @Prop()
  category: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  author: mongoose.Schema.Types.ObjectId;

  @Prop({ enum: ['free', 'paid'], default: 'free' })
  audienceType: string;

  @Prop({ type: Number, default: 0 })
  price: number;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
