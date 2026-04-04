import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Payment, PaymentDocument } from './entities/payment.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import {
  PaymentMethod,
  PaymentMethodDocument,
} from '../payment-method/entities/payment-method.entity';
import Stripe from 'stripe';
import config from 'src/app/config';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(PaymentMethod.name)
    private readonly paymentMethodModel: Model<PaymentMethodDocument>,
  ) {
    this.stripe = new Stripe(config.stripe.secretKey!);
  }

  private getTestCardToken(cardNumber: string) {
    const normalized = cardNumber.replace(/\s+/g, '');

    const tokenMap: Record<string, string> = {
      '4242424242424242': 'tok_visa',
      '5555555555554444': 'tok_mastercard',
      '4000000000003220': 'tok_visa_debit',
      '378282246310005': 'tok_amex',
      '6011111111111117': 'tok_discover',
    };

    return tokenMap[normalized];
  }

  private async ensureStripeCustomer(user: UserDocument) {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user._id.toString() },
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  }

  private buildPaymentIntentResponse(
    paymentIntent: Stripe.PaymentIntent,
    amount: number,
    adminAmount: number,
    authorAmount: number,
  ) {
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount,
      adminAmount,
      authorAmount,
    };
  }

  private async confirmPaymentIntentIfPossible(
    paymentIntentId: string,
    stripePaymentMethodId: string,
  ) {
    return this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: stripePaymentMethodId,
    });
  }

  private async resolveStripePaymentMethodId(
    user: UserDocument,
    savedMethodId?: string,
  ): Promise<string | undefined> {
    if (!savedMethodId) return undefined;

    const saved = await this.paymentMethodModel.findOne({
      _id: savedMethodId,
      userId: user._id,
    });
    if (!saved) throw new HttpException('Saved payment method not found', 404);

    const token = this.getTestCardToken(saved.cardNumber);
    if (!token) {
      throw new HttpException(
        'This saved card cannot be used for Stripe test payment',
        400,
      );
    }

    const stripeCustomerId = await this.ensureStripeCustomer(user);
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: { token },
      billing_details: {
        name: saved.cardHolderName ?? user.fullName,
      },
    });

    await this.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: stripeCustomerId,
    });

    await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    return paymentMethod.id;
  }

  async unlockBlog(userId: string, blogId: string, savedMethodId?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const blog = await this.blogModel.findById(blogId);
    if (!blog) throw new HttpException('Blog not found', 404);

    const author = await this.userModel.findById(blog.author);
    if (!author) throw new HttpException('Blog author not found', 404);

    if (blog.audienceType !== 'paid' || blog.price <= 0)
      throw new HttpException('This blog does not require payment', 400);

    if (blog.author.toString() === user._id.toString())
      throw new HttpException('You cannot unlock your own blog', 400);

    if (!author.stripeAccountId) {
      throw new HttpException(
        'Blog author has not completed Stripe account setup',
        400,
      );
    }

    const existingCompleted = await this.paymentModel.findOne({
      user: user._id,
      blog: blog._id,
      paymentType: 'blog',
      status: 'completed',
    });
    if (existingCompleted)
      throw new HttpException('Blog already unlocked', 400);

    const stripePaymentMethodId = await this.resolveStripePaymentMethodId(
      user,
      savedMethodId,
    );

    const existingPending = await this.paymentModel.findOne({
      user: user._id,
      blog: blog._id,
      paymentType: 'blog',
      status: 'pending',
    });

    if (existingPending?.stripePaymentIntentId) {
      const pi = await this.stripe.paymentIntents.retrieve(
        existingPending.stripePaymentIntentId,
      );
      if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
        let latestPi = pi;

        if (
          stripePaymentMethodId &&
          pi.payment_method !== stripePaymentMethodId
        ) {
          const updateParams: Stripe.PaymentIntentUpdateParams = {
            payment_method: stripePaymentMethodId,
          };
          if (!pi.customer && user.stripeCustomerId) {
            updateParams.customer = user.stripeCustomerId;
          }
          latestPi = await this.stripe.paymentIntents.update(
            pi.id,
            updateParams,
          );
        }

        if (
          stripePaymentMethodId &&
          ['requires_payment_method', 'requires_confirmation'].includes(
            latestPi.status,
          )
        ) {
          latestPi = await this.confirmPaymentIntentIfPossible(
            latestPi.id,
            stripePaymentMethodId,
          );
        }

        return this.buildPaymentIntentResponse(
          latestPi,
          blog.price,
          existingPending.adminAmount,
          existingPending.authorAmount,
        );
      }
    }

    const adminAmount = Number((blog.price * 0.1).toFixed(2));
    const authorAmount = Number((blog.price - adminAmount).toFixed(2));
    const totalAmountInCents = Math.round(blog.price * 100);
    const adminAmountInCents = Math.round(adminAmount * 100);

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      receipt_email: user.email,
      application_fee_amount: adminAmountInCents,
      transfer_data: { destination: author.stripeAccountId },
      metadata: {
        userId: user._id.toString(),
        blogId: blog._id.toString(),
        authorId: author._id.toString(),
        paymentType: 'blog',
        price: blog.price.toString(),
        adminAmount: adminAmount.toString(),
        authorAmount: authorAmount.toString(),
      },
    };

    if (user.stripeCustomerId) {
      piParams.customer = user.stripeCustomerId;
    }

    if (stripePaymentMethodId) {
      piParams.payment_method = stripePaymentMethodId;
      piParams.confirm = true;
    }

    const paymentIntent = await this.stripe.paymentIntents.create(piParams);

    if (existingPending) {
      existingPending.stripePaymentIntentId = paymentIntent.id;
      existingPending.amount = blog.price;
      existingPending.adminAmount = adminAmount;
      existingPending.authorAmount = authorAmount;
      await existingPending.save();
    } else {
      await this.paymentModel.create({
        user: user._id,
        blog: blog._id,
        stripePaymentIntentId: paymentIntent.id,
        amount: blog.price,
        adminAmount,
        authorAmount,
        paymentType: 'blog',
        status: 'pending',
      });
    }

    return this.buildPaymentIntentResponse(
      paymentIntent,
      blog.price,
      adminAmount,
      authorAmount,
    );
  }

  async subscribeToPlan(
    userId: string,
    planId: string,
    savedMethodId?: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const plan = await this.subscriptionModel.findById(planId);
    if (!plan) throw new HttpException('Subscription plan not found', 404);

    const author = await this.userModel.findById(plan.author);
    if (!author) throw new HttpException('Subscription author not found', 404);

    if (author._id.toString() === user._id.toString())
      throw new HttpException('You cannot subscribe to your own plan', 400);

    if (!author.stripeAccountId) {
      throw new HttpException(
        'Subscription author has not completed Stripe account setup',
        400,
      );
    }

    const existingCompleted = await this.paymentModel.findOne({
      user: user._id,
      plan: plan._id,
      paymentType: 'subscription',
      status: 'completed',
    } as any);
    if (existingCompleted)
      throw new HttpException('Subscription already purchased', 400);

    const stripePaymentMethodId = await this.resolveStripePaymentMethodId(
      user,
      savedMethodId,
    );

    const existingPending = await this.paymentModel.findOne({
      user: user._id,
      plan: plan._id,
      paymentType: 'subscription',
      status: 'pending',
    } as any);

    if (existingPending?.stripePaymentIntentId) {
      const pi = await this.stripe.paymentIntents.retrieve(
        existingPending.stripePaymentIntentId,
      );
      if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
        let latestPi = pi;

        if (
          stripePaymentMethodId &&
          pi.payment_method !== stripePaymentMethodId
        ) {
          const updateParams: Stripe.PaymentIntentUpdateParams = {
            payment_method: stripePaymentMethodId,
          };
          if (!pi.customer && user.stripeCustomerId) {
            updateParams.customer = user.stripeCustomerId;
          }
          latestPi = await this.stripe.paymentIntents.update(
            pi.id,
            updateParams,
          );
        }

        if (
          stripePaymentMethodId &&
          ['requires_payment_method', 'requires_confirmation'].includes(
            latestPi.status,
          )
        ) {
          latestPi = await this.confirmPaymentIntentIfPossible(
            latestPi.id,
            stripePaymentMethodId,
          );
        }

        return this.buildPaymentIntentResponse(
          latestPi,
          plan.price,
          existingPending.adminAmount,
          existingPending.authorAmount,
        );
      }
    }

    const adminAmount = Number((plan.price * 0.1).toFixed(2));
    const authorAmount = Number((plan.price - adminAmount).toFixed(2));
    const totalAmountInCents = Math.round(plan.price * 100);
    const adminAmountInCents = Math.round(adminAmount * 100);

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      receipt_email: user.email,
      application_fee_amount: adminAmountInCents,
      transfer_data: { destination: author.stripeAccountId },
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        authorId: author._id.toString(),
        paymentType: 'subscription',
        price: plan.price.toString(),
        duration: plan.duration,
        adminAmount: adminAmount.toString(),
        authorAmount: authorAmount.toString(),
      },
    };

    if (user.stripeCustomerId) {
      piParams.customer = user.stripeCustomerId;
    }

    if (stripePaymentMethodId) {
      piParams.payment_method = stripePaymentMethodId;
      piParams.confirm = true;
    }

    const paymentIntent = await this.stripe.paymentIntents.create(piParams);

    if (existingPending) {
      existingPending.stripePaymentIntentId = paymentIntent.id;
      existingPending.amount = plan.price;
      existingPending.adminAmount = adminAmount;
      existingPending.authorAmount = authorAmount;
      await existingPending.save();
    } else {
      await this.paymentModel.create({
        user: user._id,
        plan: plan._id as any,
        stripePaymentIntentId: paymentIntent.id,
        amount: plan.price,
        adminAmount,
        authorAmount,
        paymentType: 'subscription',
        status: 'pending',
      });
    }

    return this.buildPaymentIntentResponse(
      paymentIntent,
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
    const whereConditions = buildWhereConditions(
      params,
      ['paymentType', 'status'],
      { user: userId },
    );

    const total = await this.paymentModel.countDocuments(whereConditions);
    const payments = await this.paymentModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .populate('user')
      .populate('blog')
      .populate({
        path: 'plan',
        populate: {
          path: 'author',
        },
      })
      .populate({
        path: 'plan',
        populate: {
          path: 'blogs',
        },
      });

    return { meta: { page, limit, total }, data: payments };
  }

  async getAuthorSales(
    authorId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const author = await this.userModel.findById(authorId);
    if (!author) throw new HttpException('Author not found', 404);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);

    const [blogs, plans] = await Promise.all([
      this.blogModel
        .find({ author: author._id } as any)
        .select('_id title price'),
      this.subscriptionModel
        .find({ author: author._id } as any)
        .select('_id name price duration'),
    ]);

    const blogIds = blogs.map((blog) => blog._id);
    const planIds = plans.map((plan) => plan._id);

    if (!blogIds.length && !planIds.length) {
      return {
        meta: {
          page,
          limit,
          total: 0,
        },
        summary: {
          totalSingleUnlocks: 0,
          totalSubscriptions: 0,
          totalRevenue: 0,
        },
        data: [],
      };
    }

    const payments = await this.paymentModel
      .find({
        status: 'completed',
        $or: [
          ...(blogIds.length ? [{ blog: { $in: blogIds } }] : []),
          ...(planIds.length ? [{ plan: { $in: planIds } as any }] : []),
        ],
      } as any)
      .sort({ createdAt: -1 } as any)
      .populate('user')
      .populate('blog')
      .populate('plan');

    const sales = payments.map((payment) => {
      const buyer = payment.user as any;
      const blog = payment.blog as any;
      const plan = payment.plan as any;

      return {
        paymentId: payment._id,
        paymentType: payment.paymentType,
        buyer,
        blog,
        plan,
        amount: payment.amount,
        authorAmount: payment.authorAmount,
        adminAmount: payment.adminAmount,
        status: payment.status,
        purchasedAt: (payment as any).createdAt,
      };
    });

    let filteredSales = sales;

    if (params.paymentType) {
      filteredSales = filteredSales.filter(
        (sale) => sale.paymentType === params.paymentType,
      );
    }

    if (params.blogId) {
      filteredSales = filteredSales.filter(
        (sale) => sale.blog?._id?.toString() === params.blogId,
      );
    }

    if (params.planId) {
      filteredSales = filteredSales.filter(
        (sale) => sale.plan?._id?.toString() === params.planId,
      );
    }

    if (params.searchTerm) {
      const searchTerm = params.searchTerm.toLowerCase();
      filteredSales = filteredSales.filter((sale) => {
        const searchableValues = [
          sale.buyer?.fullName,
          sale.buyer?.email,
          sale.buyer?.userName,
          sale.blog?.title,
          sale.plan?.name,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return searchableValues.some((value) => value.includes(searchTerm));
      });
    }

    filteredSales = filteredSales.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;

      if (sortBy === 'amount') {
        return (Number(a.amount) - Number(b.amount)) * direction;
      }

      if (sortBy === 'authorAmount') {
        return (Number(a.authorAmount) - Number(b.authorAmount)) * direction;
      }

      return (
        (new Date(a.purchasedAt).getTime() -
          new Date(b.purchasedAt).getTime()) *
        direction
      );
    });

    const totalRevenue = filteredSales.reduce(
      (sum, payment) => sum + Number(payment.authorAmount || 0),
      0,
    );

    const paginatedSales = filteredSales.slice(skip, skip + limit);

    return {
      meta: {
        page,
        limit,
        total: filteredSales.length,
      },
      summary: {
        totalSingleUnlocks: filteredSales.filter(
          (sale) => sale.paymentType === 'blog',
        ).length,
        totalSubscriptions: filteredSales.filter(
          (sale) => sale.paymentType === 'subscription',
        ).length,
        totalRevenue,
      },
      data: paginatedSales,
    };
  }
}
