import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
export type UserDocument = HydratedDocument<User>;
import * as bcrypt from 'bcrypt';
import config from '../../../config';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'Full name is required'],
    trim: true,
  })
  fullName!: string;

  @Prop({
    required: [true, 'User name is required'],
    trim: true,
    unique: true,
  })
  userName!: string;

  @Prop({
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  })
  password!: string;

  @Prop({
    enum: ['author', 'reader'],
  })
  role!: string;

  @Prop()
  pronounce!: string;

  @Prop({ enum: ['male', 'female'] })
  gender!: string;

  @Prop()
  phoneNumber!: string;

  @Prop()
  bio!: string;

  @Prop()
  profilePicture!: string;

  @Prop()
  coverPicture!: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiry?: Date;

  @Prop()
  verifiedForget!: boolean;

  @Prop()
  stripeAccountId!: string;

  @Prop()
  stripeCustomerId!: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Follower' })
  followersReaders!: Types.ObjectId[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Follower' })
  followingAuthors!: Types.ObjectId[];

  @Prop({ default: true })
  loginAlerts!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcryptSaltRounds),
  );
});
