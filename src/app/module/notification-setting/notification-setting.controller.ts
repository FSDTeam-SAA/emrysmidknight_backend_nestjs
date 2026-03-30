import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotificationSettingService } from './notification-setting.service';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

@Controller('notification-setting')
export class NotificationSettingController {
  constructor(private readonly notificationSettingService: NotificationSettingService) {}

  @Post()
  create(@Body() createNotificationSettingDto: CreateNotificationSettingDto) {
    return this.notificationSettingService.create(createNotificationSettingDto);
  }

  @Get()
  findAll() {
    return this.notificationSettingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationSettingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotificationSettingDto: UpdateNotificationSettingDto) {
    return this.notificationSettingService.update(+id, updateNotificationSettingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationSettingService.remove(+id);
  }
}
