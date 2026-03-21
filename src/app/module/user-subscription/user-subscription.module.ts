import { Module } from '@nestjs/common';
import { UserSubscriptionService } from './user-subscription.service';
import { UserSubscriptionController } from './user-subscription.controller';

@Module({
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
})
export class UserSubscriptionModule {}
