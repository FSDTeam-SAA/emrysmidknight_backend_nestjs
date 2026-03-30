import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import {
  Notification,
  NotificationSchema,
} from './entities/notification.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import {
  NotificationSettings,
  NotificationSettingsSchema,
} from '../notification-setting/entities/notification-setting.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService], // অন্য module থেকে use করতে পারবে
})
export class NotificationModule {}
