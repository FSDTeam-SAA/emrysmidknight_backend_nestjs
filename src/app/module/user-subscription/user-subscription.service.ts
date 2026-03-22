import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from './entities/user-subscription.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>,
  ) {}

  async getMyActiveSubscriptions(userId: string) {
    const now = new Date();

    await this.userSubscriptionModel.updateMany(
      {
        user: userId,
        isActive: true,
        expiryDate: { $lt: now },
      } as any,
      {
        $set: { isActive: false },
      },
    );

    return this.userSubscriptionModel
      .find({
        user: userId,
        isActive: true,
        expiryDate: { $gt: now },
      } as any)
      .populate({
        path: 'plan',
        populate: [{ path: 'author' }, { path: 'blogs' }],
      });
  }

  async checkBlogAccess(userId: string, blogId: string) {
    const blog = await this.blogModel.findById(blogId);
    if (!blog) {
      throw new HttpException('Blog not found', 404);
    }

    if (blog.audienceType !== 'paid' || blog.price <= 0) {
      return {
        hasAccess: true,
        accessType: 'free',
        blogId,
      };
    }

    const directPayment = await this.paymentModel.findOne({
      user: userId,
      blog: blog._id,
      paymentType: 'blog',
      status: 'completed',
    });

    if (directPayment) {
      return {
        hasAccess: true,
        accessType: 'single_purchase',
        blogId,
      };
    }

    const activeSubscriptions = await this.getMyActiveSubscriptions(userId);
    const planIds = activeSubscriptions
      .map((item) => (item.plan as any)?._id?.toString())
      .filter(Boolean);

    if (planIds.length) {
      const coveringPlan = await this.subscriptionModel.findOne({
        _id: { $in: planIds },
        blogs: blog._id,
      });

      if (coveringPlan) {
        return {
          hasAccess: true,
          accessType: 'subscription',
          blogId,
          planId: coveringPlan._id,
        };
      }
    }

    return {
      hasAccess: false,
      accessType: null,
      blogId,
    };
  }
}
