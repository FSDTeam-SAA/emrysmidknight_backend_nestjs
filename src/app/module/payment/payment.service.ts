import { HttpException, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Payment, PaymentDocument } from './entities/payment.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import Stripe from 'stripe';
import config from 'src/app/config';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {
    this.stripe = new Stripe(config.stripe.secretKey!);
  }

  private buildCheckoutResponse(
    session: Stripe.Checkout.Session,
    amount: number,
    adminAmount: number,
    authorAmount: number,
  ) {
    return {
      sessionId: session.id,
      url: session.url,
      amount,
      adminAmount,
      authorAmount,
    };
  }

  async unlockBlog(userId: string, blogId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new HttpException('user is not found', 404);

    const blog = await this.blogModel.findById(blogId);

    if (!blog) throw new HttpException('Blog is not found', 404);

    const author = await this.userModel.findById(blog.author);
    if (!author) {
      throw new HttpException('Blog author not found', 404);
    }

    if (blog.audienceType !== 'paid' || blog.price <= 0) {
      throw new HttpException('This blog does not require payment', 400);
    }

    if (blog.author.toString() === user._id.toString()) {
      throw new HttpException('You cannot unlock your own blog', 400);
    }

    if (!author.stripeAccountId) {
      throw new HttpException(
        'Blog author has not completed Stripe account setup',
        400,
      );
    }

    const existingCompletedPayment = await this.paymentModel.findOne({
      user: user._id,
      blog: blog._id,
      paymentType: 'blog',
      status: 'completed',
    });

    if (existingCompletedPayment) {
      throw new HttpException('Blog already unlocked', 400);
    }

    const existingPendingPayment = await this.paymentModel.findOne({
      user: user._id,
      blog: blog._id,
      paymentType: 'blog',
      status: 'pending',
    });

    if (existingPendingPayment?.stripeSessionId) {
      const existingSession = await this.stripe.checkout.sessions.retrieve(
        existingPendingPayment.stripeSessionId,
      );

      if (
        existingSession.status === 'open' &&
        existingSession.url
      ) {
        return this.buildCheckoutResponse(
          existingSession,
          blog.price,
          existingPendingPayment.adminAmount,
          existingPendingPayment.authorAmount,
        );
      }
    }

    const adminAmount = Number((blog.price * 0.1).toFixed(2));
    const authorAmount = Number((blog.price - adminAmount).toFixed(2));
    const totalAmountInCents = Math.round(blog.price * 100);
    const adminAmountInCents = Math.round(adminAmount * 100);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: blog.title,
              description: blog.content,
            },
            unit_amount: totalAmountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: adminAmountInCents,
        transfer_data: {
          destination: author.stripeAccountId,
        },
      },
      customer_email: user.email,
      success_url: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payment/cancel`,
      metadata: {
        userId: user._id.toString(),
        blogId: blog._id.toString(),
        authorId: author._id.toString(),
        authorStripeAccountId: author.stripeAccountId,
        paymentType: 'blog',
        price: blog.price.toString(),
        adminAmount: adminAmount.toString(),
        authorAmount: authorAmount.toString(),
      },
    } as Stripe.Checkout.SessionCreateParams);

    if (existingPendingPayment) {
      existingPendingPayment.stripeSessionId = session.id;
      existingPendingPayment.amount = blog.price;
      existingPendingPayment.authorAmount = authorAmount;
      existingPendingPayment.adminAmount = adminAmount;
      existingPendingPayment.paymentType = 'blog';
      await existingPendingPayment.save();
    } else {
      await this.paymentModel.create({
        user: user._id,
        blog: blog._id,
        stripeSessionId: session.id,
        amount: blog.price,
        authorAmount,
        adminAmount,
        paymentType: 'blog',
      });
    }

    return this.buildCheckoutResponse(
      session,
      blog.price,
      adminAmount,
      authorAmount,
    );
  }

  async subscribeToPlan(userId: string, planId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('user is not found', 404);

    const plan = await this.subscriptionModel.findById(planId);
    if (!plan) throw new HttpException('Subscription plan not found', 404);

    const author = await this.userModel.findById(plan.author);
    if (!author) {
      throw new HttpException('Subscription author not found', 404);
    }

    if (author._id.toString() === user._id.toString()) {
      throw new HttpException('You cannot subscribe to your own plan', 400);
    }

    if (!author.stripeAccountId) {
      throw new HttpException(
        'Subscription author has not completed Stripe account setup',
        400,
      );
    }

    const existingCompletedPayment = await this.paymentModel.findOne({
      user: user._id,
      plan: plan._id,
      paymentType: 'subscription',
      status: 'completed',
    } as any);

    if (existingCompletedPayment) {
      throw new HttpException('Subscription already purchased', 400);
    }

    const existingPendingPayment = await this.paymentModel.findOne({
      user: user._id,
      plan: plan._id,
      paymentType: 'subscription',
      status: 'pending',
    } as any);

    if (existingPendingPayment?.stripeSessionId) {
      const existingSession = await this.stripe.checkout.sessions.retrieve(
        existingPendingPayment.stripeSessionId,
      );

      if (existingSession.status === 'open' && existingSession.url) {
        return this.buildCheckoutResponse(
          existingSession,
          plan.price,
          existingPendingPayment.adminAmount,
          existingPendingPayment.authorAmount,
        );
      }
    }

    const adminAmount = Number((plan.price * 0.1).toFixed(2));
    const authorAmount = Number((plan.price - adminAmount).toFixed(2));
    const totalAmountInCents = Math.round(plan.price * 100);
    const adminAmountInCents = Math.round(adminAmount * 100);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: `Subscription plan (${plan.duration})`,
            },
            unit_amount: totalAmountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: adminAmountInCents,
        transfer_data: {
          destination: author.stripeAccountId,
        },
      },
      customer_email: user.email,
      success_url: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payment/cancel`,
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        authorId: author._id.toString(),
        authorStripeAccountId: author.stripeAccountId,
        paymentType: 'subscription',
        price: plan.price.toString(),
        duration: plan.duration,
        adminAmount: adminAmount.toString(),
        authorAmount: authorAmount.toString(),
      },
    } as Stripe.Checkout.SessionCreateParams);

    if (existingPendingPayment) {
      existingPendingPayment.stripeSessionId = session.id;
      existingPendingPayment.amount = plan.price;
      existingPendingPayment.authorAmount = authorAmount;
      existingPendingPayment.adminAmount = adminAmount;
      existingPendingPayment.paymentType = 'subscription';
      existingPendingPayment.plan = plan._id as any;
      await existingPendingPayment.save();
    } else {
      await this.paymentModel.create({
        user: user._id,
        plan: plan._id as any,
        stripeSessionId: session.id,
        amount: plan.price,
        authorAmount,
        adminAmount,
        paymentType: 'subscription',
      });
    }

    return this.buildCheckoutResponse(
      session,
      plan.price,
      adminAmount,
      authorAmount,
    );
  }

  async getMyPayments(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, ['name', 'email'], {
      user: userId,
    });
    const total = await this.paymentModel.countDocuments(whereConditions);
    const payments = await this.paymentModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('user')
      .populate('blog')
      .populate('plan');
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: payments,
    };
  }
}
