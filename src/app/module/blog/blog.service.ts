// blog.service.ts

import { HttpException, Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Blog, BlogDocument } from './entities/blog.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../user-subscription/entities/user-subscription.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import {
  Follower,
  FollowerDocument,
} from '../followers/entities/follower.entity';
import {
  Bookmark,
  BookmarkDocument,
} from '../bookmark/entities/bookmark.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Follower.name)
    private readonly followerModel: Model<FollowerDocument>,
    @InjectModel(Bookmark.name)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  private sanitizeBlogUpdatePayload(updateBlogDto: UpdateBlogDto) {
    return Object.fromEntries(
      Object.entries(updateBlogDto).filter(([_, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (typeof value === 'number' && Number.isNaN(value)) return false;
        return true;
      }),
    );
  }

  async createBlog(
    userId: string,
    createBlogDto: CreateBlogDto,
    files?: {
      image?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      attachment?: Express.Multer.File[];
    },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    if (createBlogDto.price && createBlogDto.price > 0 && !user.stripeAccountId) {
      throw new HttpException('You need to have a stripe account to create a paid blog', 400);
    }

    if (files) {
      const uploadPromises: Promise<void>[] = [];

      if (files.image?.length) {
        uploadPromises.push(
          Promise.all(
            files.image.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            createBlogDto.image = res.map((r) => r.url);
          }),
        );
      }
      if (files.audio?.length) {
        uploadPromises.push(
          Promise.all(
            files.audio.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            createBlogDto.audio = res.map((r) => r.url);
          }),
        );
      }
      if (files.attachment?.length) {
        uploadPromises.push(
          Promise.all(
            files.attachment.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            createBlogDto.attachment = res.map((r) => r.url);
          }),
        );
      }

      await Promise.all(uploadPromises);
    }

    const result = await this.blogModel.create({
      ...createBlogDto,
      author: user._id as any,
    });

    // Notify all followers
    const followers = await this.followerModel.find({ author: user._id });
    const notifType =
      result.audienceType === 'paid'
        ? NotificationType.PREMIUM_CONTENT
        : NotificationType.AUTHOR_POST;

    const notificationPromises = followers.map((f) => {
      const isPaid = result.audienceType === 'paid';
      const message = `${user.fullName} has published a new ${isPaid ? 'premium ' : ''}story "${result.title}"${isPaid ? ' Subscribe to unlock and continue reading.' : ''}`;

      return this.notificationService.sendNotification({
        recipientId: f.followers.toString(),
        senderId: user._id.toString(),
        message,
        type: notifType,
        blogId: result._id.toString(),
      });
    });

    await Promise.all(notificationPromises);

    return result;
  }

  async getAllBlogs(params: IFilterParams, options: IOptions) {
    const blogSearchAbleFields = [
      'title',
      'content',
      'audienceType',
      'category',
    ];
    const whereConditions = buildWhereConditions(params, blogSearchAbleFields);
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.blogModel.countDocuments(whereConditions);
    const result = await this.blogModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        },
      });
    return { meta: { page, limit, total }, data: result };
  }

  async getAllMyBlogs(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const blogSearchAbleFields = [
      'title',
      'content',
      'audienceType',
      'category',
    ];
    const whereConditions = buildWhereConditions(params, blogSearchAbleFields, {
      author: user._id,
    });
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.blogModel.countDocuments(whereConditions);
    const result = await this.blogModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        },
      });
    return { meta: { page, limit, total }, data: result };
  }

  async singleBlogPardFree(userId: string, id: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const result = await this.blogModel.findById(id).populate('author');
    if (!result) throw new HttpException('Blog not found', 404);

    if (
      result.audienceType !== 'paid' ||
      result.price <= 0 ||
      (result.author as any)._id.toString() === userId
    ) {
      return result;
    }

    const directPayment = await this.paymentModel.findOne({
      user: user._id,
      blog: result._id,
      paymentType: 'blog',
      status: 'completed',
    } as any);

    if (directPayment) return result;

    const now = new Date();
    await this.userSubscriptionModel.updateMany(
      { user: user._id, isActive: true, expiryDate: { $lt: now } } as any,
      { $set: { isActive: false } },
    );

    const activeSubscriptions = await this.userSubscriptionModel.find({
      user: user._id,
      isActive: true,
      expiryDate: { $gt: now },
    } as any);

    const planIds = activeSubscriptions
      .map((item) => item.plan?.toString())
      .filter(Boolean);

    if (planIds.length) {
      const coveringPlan = await this.subscriptionModel.findOne({
        _id: { $in: planIds },
        blogs: result._id,
      } as any);

      if (coveringPlan) return result;
    }

    throw new HttpException('You are not allowed to access this blog', 403);
  }

  async getSingleBlog(id: string) {
    const result = await this.blogModel
      .findById(id)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        },
      });
    if (!result) throw new HttpException('Blog not found', 404);
    return result;
  }

  async updateBlog(
    id: string,
    updateBlogDto: UpdateBlogDto,
    files?: {
      image?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      attachment?: Express.Multer.File[];
    },
  ) {
    if (files) {
      const uploadPromises: Promise<void>[] = [];

      if (files.image?.length) {
        uploadPromises.push(
          Promise.all(
            files.image.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            updateBlogDto.image = res.map((r) => r.url);
          }),
        );
      }
      if (files.audio?.length) {
        uploadPromises.push(
          Promise.all(
            files.audio.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            updateBlogDto.audio = res.map((r) => r.url);
          }),
        );
      }
      if (files.attachment?.length) {
        uploadPromises.push(
          Promise.all(
            files.attachment.map((file) => fileUpload.uploadToCloudinary(file)),
          ).then((res) => {
            updateBlogDto.attachment = res.map((r) => r.url);
          }),
        );
      }

      await Promise.all(uploadPromises);
    }

    const sanitizedUpdateBlogDto =
      this.sanitizeBlogUpdatePayload(updateBlogDto);
    const result = await this.blogModel.findByIdAndUpdate(
      id,
      { $set: sanitizedUpdateBlogDto },
      { new: true, runValidators: true },
    );
    if (!result) throw new HttpException('Blog not found', 404);
    return result;
  }

  async deleteBlog(id: string) {
    const result = await this.blogModel.findByIdAndDelete(id);
    if (!result) throw new HttpException('Blog not found', 404);
    return result;
  }

  async likeUnlikeBlog(userId: string, blogId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const blog = await this.blogModel.findById(blogId);
    if (!blog) throw new HttpException('Blog not found', 404);

    const userIdString = user._id.toString();
    const alreadyLiked = blog.likes.some(
      (likeUserId) => likeUserId.toString() === userIdString,
    );

    if (alreadyLiked) {
      blog.likes = blog.likes.filter(
        (likeUserId) => likeUserId.toString() !== userIdString,
      );
    } else {
      blog.likes.push(user._id);
    }

    const result = await blog.save();
    return { liked: !alreadyLiked, blog: result };
  }

  async getAllTrendingStory(options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const result = await this.blogModel
      .find({ likes: { $exists: true, $ne: [] } })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author');
    const total = await this.blogModel.countDocuments();
    return { meta: { page, limit, total }, data: result };
  }

  async getBlogsWithLockStatus(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const blogSearchAbleFields = [
      'title',
      'content',
      'audienceType',
      'category',
    ];
    const whereConditions = buildWhereConditions(params, blogSearchAbleFields);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const now = new Date();

    // 1. Direct purchased blog ids
    const payments = await this.paymentModel.find({
      user: user._id,
      paymentType: 'blog',
      status: 'completed',
    });
    const purchasedBlogIds = new Set(
      payments.map((p) => p.blog?.toString()).filter(Boolean),
    );

    // 2. Expire হওয়া subscriptions বন্ধ করো
    await this.userSubscriptionModel.updateMany(
      { user: user._id, isActive: true, expiryDate: { $lt: now } } as any,
      { $set: { isActive: false } },
    );

    // 3. Active subscription এর blog ids
    const activeSubscriptions = await this.userSubscriptionModel.find({
      user: user._id,
      isActive: true,
      expiryDate: { $gt: now },
    } as any);

    const planIds = activeSubscriptions
      .map((s) => s.plan?.toString())
      .filter(Boolean);

    let subscribedBlogIds = new Set<string>();
    if (planIds.length) {
      const plans = await this.subscriptionModel.find({
        _id: { $in: planIds },
      });
      subscribedBlogIds = new Set(
        plans.flatMap((p) => p.blogs.map((b) => b.toString())),
      );
    }

    const bookmarks = await this.bookmarkModel.find({ user: user._id });
    const bookmarkedBlogIds = new Set(
      bookmarks.map((bookmark) => bookmark.blog?.toString()).filter(Boolean),
    );

    // 4. Filtered blogs আনো
    const total = await this.blogModel.countDocuments(whereConditions);
    const blogs = await this.blogModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        },
      });

    // 5. isLocked status যোগ করো
    const data = blogs.map((blog) => {
      const blogId = (blog._id as any).toString();
      const isOwner = (blog.author as any)?._id?.toString() === userId;
      const isFree = blog.audienceType === 'free';
      const isPurchased = purchasedBlogIds.has(blogId);
      const isSubscribed = subscribedBlogIds.has(blogId);
      const isBookmarked = bookmarkedBlogIds.has(blogId);

      const isLocked = !isFree && !isOwner && !isPurchased && !isSubscribed;

      return { ...blog.toObject(), isLocked, isBookmarked };
    });

    return { meta: { page, limit, total }, data };
  }

  async loginAlert(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);
  }
}
