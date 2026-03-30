import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

import type { Request } from 'express';
import AuthGuard from 'src/app/middlewares/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import pick from 'src/app/helpers/pick';
import { UpdateNotificationSettingDto } from '../notification-setting/dto/update-notification-setting.dto';

@ApiTags('Notification')
@Controller('notification')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('author', 'reader'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── GET /notification ───────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get my all notifications (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getMyNotifications(@Req() req: Request) {
    const userId = req.user!.id;
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.notificationService.getMyNotifications(
      userId,
      options,
    );
    return {
      message: 'Notifications fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  // ─── GET /notification/unread-count ──────────────────────────────────────
  @Get('/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@Req() req: Request) {
    const result = await this.notificationService.getUnreadCount(req.user!.id);
    return { message: 'Unread count fetched successfully', data: result };
  }

  // ─── GET /notification/settings ──────────────────────────────────────────
  @Get('/settings')
  @ApiOperation({ summary: 'Get my notification settings' })
  @HttpCode(HttpStatus.OK)
  async getNotificationSettings(@Req() req: Request) {
    const result = await this.notificationService.getNotificationSettings(
      req.user!.id,
    );
    return {
      message: 'Notification settings fetched successfully',
      data: result,
    };
  }

  // ─── PATCH /notification/settings ────────────────────────────────────────
  @Patch('/settings')
  @ApiOperation({ summary: 'Update my notification settings' })
  @HttpCode(HttpStatus.OK)
  async updateNotificationSettings(
    @Req() req: Request,
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    const result = await this.notificationService.updateNotificationSettings(
      req.user!.id,
      dto,
    );
    return {
      message: 'Notification settings updated successfully',
      data: result,
    };
  }

  // ─── PATCH /notification/mark-all-read ───────────────────────────────────
  @Patch('/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: Request) {
    const result = await this.notificationService.markAllAsRead(req.user!.id);
    return { message: result.message };
  }

  // ─── PATCH /notification/:id/read ────────────────────────────────────────
  @Patch('/:id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: String, description: 'Notification id' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    const result = await this.notificationService.markAsRead(req.user!.id, id);
    return { message: 'Notification marked as read', data: result };
  }

  // ─── DELETE /notification/:id ────────────────────────────────────────────
  @Delete('/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: String, description: 'Notification id' })
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Req() req: Request, @Param('id') id: string) {
    const result = await this.notificationService.deleteNotification(
      req.user!.id,
      id,
    );
    return { message: 'Notification deleted successfully', data: result };
  }
}
