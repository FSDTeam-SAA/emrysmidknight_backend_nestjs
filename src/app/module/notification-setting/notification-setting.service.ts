import { Injectable } from '@nestjs/common';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

@Injectable()
export class NotificationSettingService {
  create(createNotificationSettingDto: CreateNotificationSettingDto) {
    return 'This action adds a new notificationSetting';
  }

  findAll() {
    return `This action returns all notificationSetting`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notificationSetting`;
  }

  update(id: number, updateNotificationSettingDto: UpdateNotificationSettingDto) {
    return `This action updates a #${id} notificationSetting`;
  }

  remove(id: number) {
    return `This action removes a #${id} notificationSetting`;
  }
}
