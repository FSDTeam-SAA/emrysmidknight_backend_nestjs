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

  async createSubscription(
    authorId: string,
    createSubscriberDto: CreateSubscriberDto,
  ) {
    const author = await this.userModel.findById(authorId);
    if (!author) {
      throw new HttpException('Author not found', 404);
    }
    const result = await this.subscriptionModel.create({
      author: author._id,
      ...createSubscriberDto,
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
    id: string,
    updateSubscriberDto: UpdateSubscriberDto,
  ) {
    this.validateObjectId(id, 'subscriptionId');
    const result = await this.subscriptionModel.findByIdAndUpdate(
      id,
      updateSubscriberDto,
      { new: true },
    );
    return result;
  }

  async deleteSubscription(id: string) {
    this.validateObjectId(id, 'subscriptionId');
    const subscribe = await this.subscriptionModel.findById(id);
    if (!subscribe) {
      throw new HttpException('Subscription not found', 404);
    }
    const result = await this.subscriptionModel.findByIdAndDelete(id);
    return result;
  }
}
