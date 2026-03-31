import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import config from 'src/app/config';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../user-subscription/entities/user-subscription.entity';
import type { Response } from 'express';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class WebhookService {
  private readonly stripe: Stripe = new Stripe(config.stripe.secretKey!);
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async handleWebhook(rawBody: Buffer, sig: string, res: Response) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        sig,
        config.stripe.webhookSecret!,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event, res);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event, res);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
          return res.json({ received: true });
      }
    } catch (err: any) {
      this.logger.error(`Handler error: ${err.message}`);
      return res.status(500).send(`Webhook Handler Error: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // payment_intent.succeeded
  // ─────────────────────────────────────────────
  private async handlePaymentIntentSucceeded(
    event: Stripe.Event,
    res: Response,
  ) {
    const intent = event.data.object as Stripe.PaymentIntent;

    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: intent.id,
    });
    if (!payment) return res.json({ received: true });

    payment.status = 'completed';
    await payment.save();

    const user = await this.userModel.findById(payment.user);
    if (!user) return res.json({ received: true });

    const paymentType = intent.metadata?.paymentType ?? payment.paymentType;

    if (paymentType === 'blog') {
      return this.handleBlogUnlockCompleted(intent, payment, user, res);
    } else if (paymentType === 'subscription') {
      return this.handleSubscriptionCompleted(intent, payment, user, res);
    }

    return res.json({ received: true });
  }

  // ─────────────────────────────────────────────
  // Blog unlock completed
  // ─────────────────────────────────────────────
  private async handleBlogUnlockCompleted(
    intent: Stripe.PaymentIntent,
    payment: PaymentDocument,
    user: UserDocument,
    res: Response,
  ) {
    const blogId = payment.blog?.toString() ?? intent.metadata?.blogId;
    if (!blogId) return res.json({ received: true });

    const blog = await this.blogModel.findById(blogId);
    if (!blog) return res.json({ received: true });

    payment.blog = blog._id as any;
    payment.paymentType = 'blog';
    payment.amount =
      payment.amount ?? Number(intent.metadata?.price ?? blog.price ?? 0);
    payment.adminAmount =
      payment.adminAmount ?? Number((Number(payment.amount) * 0.1).toFixed(2));
    payment.authorAmount =
      payment.authorAmount ??
      Number((Number(payment.amount) - Number(payment.adminAmount)).toFixed(2));
    await payment.save();

    await this.notificationService.sendNotification({
      recipientId: user._id.toString(),
      message: `Your payment was successful! You have unlocked "${blog.title}".`,
      type: NotificationType.PAYMENT_SUCCESS,
      blogId: blog._id.toString(),
    });

    return res.json({
      received: true,
      type: 'blog',
      userId: user._id,
      blogId: blog._id,
    });
  }

  // ─────────────────────────────────────────────
  // Subscription completed
  // ─────────────────────────────────────────────
  private async handleSubscriptionCompleted(
    intent: Stripe.PaymentIntent,
    payment: PaymentDocument,
    user: UserDocument,
    res: Response,
  ) {
    const planId = payment.plan?.toString() ?? intent.metadata?.planId;
    if (!planId) return res.json({ received: true });

    const plan = await this.subscriptionModel.findById(planId);
    if (!plan) return res.json({ received: true });

    payment.plan = plan._id as any;
    payment.paymentType = 'subscription';
    payment.amount =
      payment.amount ?? Number(intent.metadata?.price ?? plan.price);
    payment.adminAmount =
      payment.adminAmount ?? Number((Number(payment.amount) * 0.1).toFixed(2));
    payment.authorAmount =
      payment.authorAmount ??
      Number((Number(payment.amount) - Number(payment.adminAmount)).toFixed(2));
    await payment.save();

    // Calculate expiry
    const expiryDate = new Date();
    if (plan.duration === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    await this.userSubscriptionModel.findOneAndUpdate(
      { user: user._id, plan: plan._id } as any,
      {
        user: user._id,
        plan: plan._id,
        expiryDate,
        isActive: true,
      } as any,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.notificationService.sendNotification({
      recipientId: user._id.toString(),
      message: `Your subscription payment was successful! You are now subscribed to "${plan.name}".`,
      type: NotificationType.PAYMENT_SUCCESS,
    });

    return res.json({
      received: true,
      type: 'subscription',
      userId: user._id,
      planId: plan._id,
    });
  }

  // ─────────────────────────────────────────────
  // payment_intent.payment_failed
  // ─────────────────────────────────────────────
  private async handlePaymentIntentFailed(event: Stripe.Event, res: Response) {
    const intent = event.data.object as Stripe.PaymentIntent;

    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: intent.id,
    });

    if (payment) {
      payment.status = 'failed';
      await payment.save();

      await this.notificationService.sendNotification({
        recipientId: payment.user.toString(),
        message: `Your payment failed or was declined. Please try again.`,
        type: NotificationType.PAYMENT_FAILED,
      });
    }

    return res.json({ received: true });
  }
}
