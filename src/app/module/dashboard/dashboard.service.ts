import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import { User, UserDocument } from '../user/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  private getMonthRange(year?: number, month?: number) {
    const now = new Date();
    const selectedYear = year ?? now.getUTCFullYear();
    const selectedMonth = month ?? now.getUTCMonth() + 1;

    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0));
    const previousStart = new Date(
      Date.UTC(selectedMonth === 1 ? selectedYear - 1 : selectedYear, selectedMonth === 1 ? 11 : selectedMonth - 2, 1, 0, 0, 0),
    );

    return {
      start,
      end,
      previousStart,
      previousEnd: start,
      label: start.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      daysInMonth: new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate(),
    };
  }

  private calculateTrend(currentValue: number, previousValue: number) {
    if (previousValue === 0) {
      return {
        percentage: currentValue > 0 ? 100 : 0,
        direction: currentValue > 0 ? 'up' : 'flat',
      };
    }

    const diff = ((currentValue - previousValue) / previousValue) * 100;

    return {
      percentage: Number(Math.abs(diff).toFixed(2)),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
  }

  async getOverview(userId: string, year?: number, month?: number) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const { start, end, previousStart, previousEnd, label, daysInMonth } =
      this.getMonthRange(year, month);

    const [blogs, plans] = await Promise.all([
      this.blogModel
        .find({ author: user._id } as any)
        .select('_id audienceType createdAt'),
      this.subscriptionModel.find({ author: user._id } as any).select('_id'),
    ]);

    const blogIds = blogs.map((blog) => blog._id);
    const planIds = plans.map((plan) => plan._id);

    const paymentQuery = {
      status: 'completed',
      $or: [
        ...(blogIds.length ? [{ blog: { $in: blogIds } }] : []),
        ...(planIds.length ? [{ plan: { $in: planIds } }] : []),
      ],
    } as any;

    const [payments, currentUnlocks, previousUnlocks] = await Promise.all([
      paymentQuery.$or.length
        ? this.paymentModel
            .find(paymentQuery)
            .select('paymentType authorAmount createdAt')
        : Promise.resolve([] as PaymentDocument[]),
      blogIds.length
        ? this.paymentModel.countDocuments({
            blog: { $in: blogIds },
            paymentType: 'blog',
            status: 'completed',
            createdAt: { $gte: start, $lt: end },
          } as any)
        : Promise.resolve(0),
      blogIds.length
        ? this.paymentModel.countDocuments({
            blog: { $in: blogIds },
            paymentType: 'blog',
            status: 'completed',
            createdAt: { $gte: previousStart, $lt: previousEnd },
          } as any)
        : Promise.resolve(0),
    ]);

    const totalPosts = blogs.length;
    const premiumPosts = blogs.filter((blog) => blog.audienceType === 'paid').length;
    const currentPosts = blogs.filter((blog: any) => {
      return blog.createdAt >= start && blog.createdAt < end;
    }).length;
    const previousPosts = blogs.filter((blog: any) => {
      return blog.createdAt >= previousStart && blog.createdAt < previousEnd;
    }).length;

    const currentPremiumPosts = blogs.filter((blog: any) => {
      return (
        blog.audienceType === 'paid' &&
        blog.createdAt >= start &&
        blog.createdAt < end
      );
    }).length;
    const previousPremiumPosts = blogs.filter((blog: any) => {
      return (
        blog.audienceType === 'paid' &&
        blog.createdAt >= previousStart &&
        blog.createdAt < previousEnd
      );
    }).length;

    const totalUnlocks = payments.filter(
      (payment) => payment.paymentType === 'blog',
    ).length;
    const totalEarnings = payments.reduce(
      (sum, payment) => sum + Number(payment.authorAmount || 0),
      0,
    );

    const currentMonthPayments = payments.filter((payment: any) => {
      return payment.createdAt >= start && payment.createdAt < end;
    });
    const previousMonthPayments = payments.filter((payment: any) => {
      return payment.createdAt >= previousStart && payment.createdAt < previousEnd;
    });

    const currentEarnings = currentMonthPayments.reduce(
      (sum, payment) => sum + Number(payment.authorAmount || 0),
      0,
    );
    const previousEarnings = previousMonthPayments.reduce(
      (sum, payment) => sum + Number(payment.authorAmount || 0),
      0,
    );

    const chartData = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const amount = currentMonthPayments
        .filter((payment: any) => payment.createdAt.getUTCDate() === day)
        .reduce((sum, payment) => sum + Number(payment.authorAmount || 0), 0);

      return {
        day: day.toString().padStart(2, '0'),
        amount: Number(amount.toFixed(2)),
      };
    });

    return {
      overview: {
        totalPosts: {
          value: totalPosts,
          trend: this.calculateTrend(currentPosts, previousPosts),
        },
        premiumPosts: {
          value: premiumPosts,
          trend: this.calculateTrend(currentPremiumPosts, previousPremiumPosts),
        },
        totalUnlocks: {
          value: totalUnlocks,
          trend: this.calculateTrend(currentUnlocks, previousUnlocks),
        },
        totalEarnings: {
          value: Number(totalEarnings.toFixed(2)),
          trend: this.calculateTrend(currentEarnings, previousEarnings),
        },
      },
      chart: {
        label,
        summary: {
          total: Number(currentEarnings.toFixed(2)),
          previous: Number(previousEarnings.toFixed(2)),
        },
        points: chartData,
      },
    };
  }
}
