import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './entities/notification.entity';

import { User, UserDocument } from '../user/entities/user.entity';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import {
  NotificationSettings,
  NotificationSettingsDocument,
} from '../notification-setting/entities/notification-setting.entity';
import { UpdateNotificationSettingDto } from '../notification-setting/dto/update-notification-setting.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly notificationSettingsModel: Model<NotificationSettingsDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Internal helper: অন্য service থেকে call করে notification পাঠাবে ───
  async sendNotification(payload: {
    recipientId: string;
    senderId?: string;
    message: string;
    type: NotificationType;
    blogId?: string;
  }) {
    const { recipientId, senderId, message, type, blogId } = payload;

    // Settings check করো — user এই type এর notification চায় কিনা
    const settings = await this.notificationSettingsModel.findOne({
      user: recipientId,
    });

    if (settings) {
      const typeSettingMap: Partial<Record<NotificationType, boolean>> = {
        [NotificationType.NEW_CHAPTER]: settings.newChapterUpdates,
        [NotificationType.AUTHOR_POST]: settings.authorPosts,
        [NotificationType.PREMIUM_CONTENT]: settings.premiumContentAlerts,
        [NotificationType.RECOMMENDED_STORY]: settings.recommendedStories,
        [NotificationType.AUTHOR_FOLLOW_UPDATE]:
          settings.authorYouFollowUpdates,
        [NotificationType.PAYMENT_SUCCESS]: settings.paymentSuccessConfirmation,
        [NotificationType.PAYMENT_FAILED]: settings.paymentFailedAlert,
      };

      // এই type disable থাকলে notification পাঠাবে না
      if (typeSettingMap[type] === false) return null;
    }

    const notification = await this.notificationModel.create({
      recipient: recipientId,
      sender: senderId || undefined,
      message,
      type,
      blog: blogId || undefined,
      isRead: false,
    });

    return notification;
  }

  // ─── Get my notifications (paginated) ───
  async getMyNotifications(userId: string, options: IOptions) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);

    const total = await this.notificationModel.countDocuments({
      recipient: user._id,
    });

    const notifications = await this.notificationModel
      .find({ recipient: user._id })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('sender', 'fullName profilePicture')
      .populate('blog', 'title');

    const unreadCount = await this.notificationModel.countDocuments({
      recipient: user._id,
      isRead: false,
    });

    return {
      meta: { page, limit, total, unreadCount },
      data: notifications,
    };
  }

  // ─── Mark single notification as read ───
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!notification) throw new HttpException('Notification not found', 404);
    return notification;
  }

  // ─── Mark all notifications as read ───
  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } },
    );
    return { message: 'All notifications marked as read' };
  }

  // ─── Delete single notification ───
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.notificationModel.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });
    if (!notification) throw new HttpException('Notification not found', 404);
    return notification;
  }

  // ─── Get unread count only ───
  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return { unreadCount: count };
  }

  // ─── Get or create notification settings ───
  async getNotificationSettings(userId: string) {
    let settings = await this.notificationSettingsModel.findOne({
      user: userId,
    });

    // প্রথমবার হলে default settings তৈরি করো
    if (!settings) {
      settings = await this.notificationSettingsModel.create({ user: userId });
    }

    return settings;
  }

  // ─── Update notification settings ───
  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingDto,
  ) {
    const settings = await this.notificationSettingsModel.findOneAndUpdate(
      { user: userId },
      { $set: dto },
      { new: true, upsert: true }, // না থাকলে তৈরি করবে
    );
    return settings;
  }
}
