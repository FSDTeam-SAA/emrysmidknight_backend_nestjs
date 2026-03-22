import { Module } from '@nestjs/common';
import { UserSubscriptionService } from './user-subscription.service';
import { UserSubscriptionController } from './user-subscription.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from './entities/user-subscription.entity';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscriber/entities/subscriber.entity';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';
import { Blog, BlogSchema } from '../blog/entities/blog.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Blog.name, schema: BlogSchema },
    ]),
  ],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
})
export class UserSubscriptionModule {}
