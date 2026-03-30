import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Follower, FollowerDocument } from './entities/follower.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class FollowersService {
  constructor(
    @InjectModel(Follower.name)
    private readonly followerModel: Model<FollowerDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async createFollower(readerId: string, authorId: string) {
    const reader = await this.userModel.findById(readerId);
    if (!reader) throw new Error('User not found');

    const author = await this.userModel.findById(authorId);
    if (!author) throw new Error('User not found');

    const result = await this.followerModel.create({
      followers: reader._id,
      author: author._id,
    });

    await Promise.all([
      this.userModel.findByIdAndUpdate(reader._id, {
        $addToSet: { followingAuthors: result._id },
      }),
      this.userModel.findByIdAndUpdate(author._id, {
        $addToSet: { followersReaders: result._id },
      }),
    ]);

    await this.notificationService.sendNotification({
      recipientId: author._id.toString(),
      senderId: reader._id.toString(),
      message: `${reader.fullName} has started following you!`,
      type: NotificationType.AUTHOR_FOLLOW_UPDATE,
    });

    return result;
  }

  async allFlowers(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params);
    const total = await this.followerModel.countDocuments(whereConditions);
    const users = await this.followerModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('followers')
      .populate('author');
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }

  async getFollowerById(id: string) {
    const result = await this.followerModel
      .findById(id)
      .populate('author')
      .populate('followers');
    if (!result) throw new HttpException('Follower not found', 404);

    return result;
  }

  async unfollow(userId: string, id: string) {
    const follower = await this.followerModel.findById(id);
    if (!follower) throw new HttpException('Follower not found', 404);

    if (follower.followers.toString() !== userId) {
      throw new HttpException(
        'You are not allowed to unfollow this record',
        403,
      );
    }

    const result = await this.followerModel.findByIdAndDelete(id);
    await Promise.all([
      this.userModel.findByIdAndUpdate(follower.followers, {
        $pull: { followingAuthors: id },
      }),
      this.userModel.findByIdAndUpdate(follower.author, {
        $pull: { followersReaders: id },
      }),
    ]);
    return result;
  }

  async getMyFollowers(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, ['name', 'email'], {
      followers: userId,
    });
    const total = await this.followerModel.countDocuments(whereConditions);
    const users = await this.followerModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('followers')
      .populate('author');
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }
}
