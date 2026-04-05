import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './app/module/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './app/module/auth/auth.module';
import { BlogModule } from './app/module/blog/blog.module';
import { SubscriberModule } from './app/module/subscriber/subscriber.module';
import { PaymentModule } from './app/module/payment/payment.module';
import { UserSubscriptionModule } from './app/module/user-subscription/user-subscription.module';
import { WebhookModule } from './app/module/webhook/webhook.module';
import { FollowersModule } from './app/module/followers/followers.module';
import { CommentModule } from './app/module/comment/comment.module';
import { BookmarkModule } from './app/module/bookmark/bookmark.module';
import { PaymentMethodModule } from './app/module/payment-method/payment-method.module';
import { SessionModule } from './app/module/session/session.module';
import { DashboardModule } from './app/module/dashboard/dashboard.module';

import config from './app/config';

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    BlogModule,
    SubscriberModule,
    PaymentModule,
    UserSubscriptionModule,
    WebhookModule,
    FollowersModule,
    CommentModule,
    BookmarkModule,
    PaymentMethodModule,
    SessionModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
