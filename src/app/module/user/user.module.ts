import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { Blog, BlogSchema } from '../blog/entities/blog.entity';
import { Follower, FollowerSchema } from '../followers/entities/follower.entity';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscriber/entities/subscriber.entity';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../user-subscription/entities/user-subscription.entity';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: Follower.name, schema: FollowerSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
