import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { NotificationModule } from '../notification/notification.module';
import { BlogController } from './blog.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { Blog, BlogSchema } from './entities/blog.entity';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../user-subscription/entities/user-subscription.entity';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscriber/entities/subscriber.entity';
import {
  Follower,
  FollowerSchema,
} from '../followers/entities/follower.entity';
import {
  Bookmark,
  BookmarkSchema,
} from '../bookmark/entities/bookmark.entity';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Follower.name, schema: FollowerSchema },
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
