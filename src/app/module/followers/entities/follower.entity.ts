import { Prop, Schema } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Follower {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  follower: Types.ObjectId;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  following: Types.ObjectId;
}
