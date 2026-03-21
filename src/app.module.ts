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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
