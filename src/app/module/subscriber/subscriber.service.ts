import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Model, Types } from 'mongoose';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import {
  Subscription,
  SubscriptionDocument,
} from './entities/subscriber.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

@Injectable()
export class SubscriberService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  private validateObjectId(id: string, fieldName = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${fieldName} is invalid`);
    }
  }

  private async validateSubscriptionBlogs(authorId: string, blogIds: string[]) {
    if (!blogIds?.length) {
      throw new BadRequestException(
        'At least one paid blog is required for a subscription plan',
      );
    }

    const uniqueBlogIds = [...new Set(blogIds)];
    const blogs = await this.blogModel.find({
      _id: { $in: uniqueBlogIds },
      author: authorId,
      audienceType: 'paid',
    } as any);

    if (blogs.length !== uniqueBlogIds.length) {
      throw new BadRequestException(
        'Subscription blogs must belong to the author and be paid blogs',
      );
    }
  }

  async createSubscription(
    authorId: string,
    createSubscriberDto: CreateSubscriberDto,
  ) {
    const author = await this.userModel.findById(authorId);
    if (!author) {
      throw new HttpException('Author not found', 404);
    }

    if (createSubscriberDto.price > 0 && !author.stripeAccountId) {
      throw new HttpException(
        'You need to have a stripe account to create a paid subscription',
        400,
      );
    }

    await this.validateSubscriptionBlogs(authorId, createSubscriberDto.blogs);

    const result = await this.subscriptionModel.create({
      author: author._id,
      ...createSubscriberDto,
      blogs: [...new Set(createSubscriberDto.blogs)],
    });
    return result;
  }

  async getAuthorSubscriptions(
    authorId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    this.validateObjectId(authorId, 'authorId');
    const subscriptionSearchAbleFields = ['name', 'duration', 'features'];
    const whereConditions = buildWhereConditions(
      params,
      subscriptionSearchAbleFields,
      { author: authorId },
    );
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.subscriptionModel.countDocuments(whereConditions);
    const result = await this.subscriptionModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate('blogs');

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
    };
  }

  async getMySubscriptions(
    authorId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    this.validateObjectId(authorId, 'authorId');
    const subscriptionSearchAbleFields = ['name', 'duration', 'features'];
    const whereConditions = buildWhereConditions(
      params,
      subscriptionSearchAbleFields,
      { author: authorId },
    );
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.subscriptionModel.countDocuments(whereConditions);
    const result = await this.subscriptionModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate('blogs');

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
    };
  }

  async getAllSubscriptions(params: IFilterParams, options: IOptions) {
    const subscriptionSearchAbleFields = ['name', 'duration', 'features'];
    const whereConditions = buildWhereConditions(
      params,
      subscriptionSearchAbleFields,
    );
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.subscriptionModel.countDocuments(whereConditions);
    const result = await this.subscriptionModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate('blogs');
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
    };
  }

  async getSingleSubscription(id: string) {
    this.validateObjectId(id, 'subscriptionId');
    const result = await this.subscriptionModel
      .findById(id)
      .populate('author')
      .populate('blogs');
    if (!result) {
      throw new HttpException('Subscription not found', 404);
    }
    return result;
  }

  async updateSubscription(
    authorId: string,
    id: string,
    updateSubscriberDto: UpdateSubscriberDto,
  ) {
    this.validateObjectId(id, 'subscriptionId');
    const subscription = await this.subscriptionModel.findById(id);
    if (!subscription) {
      throw new HttpException('Subscription not found', 404);
    }

    if (subscription.author.toString() !== authorId) {
      throw new HttpException(
        'You are not allowed to update this subscription',
        403,
      );
    }

    if (updateSubscriberDto.blogs) {
      await this.validateSubscriptionBlogs(authorId, updateSubscriberDto.blogs);
      updateSubscriberDto.blogs = [...new Set(updateSubscriberDto.blogs)];
    }

    const result = await this.subscriptionModel.findByIdAndUpdate(
      id,
      updateSubscriberDto,
      { new: true },
    );
    return result;
  }

  async deleteSubscription(authorId: string, id: string) {
    this.validateObjectId(id, 'subscriptionId');
    const subscribe = await this.subscriptionModel.findById(id);
    if (!subscribe) {
      throw new HttpException('Subscription not found', 404);
    }

    if (subscribe.author.toString() !== authorId) {
      throw new HttpException(
        'You are not allowed to delete this subscription',
        403,
      );
    }

    const result = await this.subscriptionModel.findByIdAndDelete(id);
    return result;
  }
}
