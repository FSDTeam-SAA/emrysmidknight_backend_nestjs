import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscriber/entities/subscriber.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { Blog, BlogSchema } from '../blog/entities/blog.entity';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../user-subscription/entities/user-subscription.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
    NotificationModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
