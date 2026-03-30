
import { Injectable, Logger } from '@nestjs/common';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
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
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event, res);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event, res);
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

  // ===============================
  // CHECKOUT COMPLETED
  // ===============================
  private async handleCheckoutCompleted(event: Stripe.Event, res: Response) {
    const session = event.data.object as Stripe.Checkout.Session;

    const payment = await this.paymentModel.findOne({
      stripeSessionId: session.id,
    });
    if (!payment) return res.json({ received: true });

    payment.paymentType = session.metadata?.paymentType ?? payment.paymentType;
    payment.status = 'completed';
    payment.stripePaymentIntentId = session.payment_intent as string;
    await payment.save();

    const user = await this.userModel.findById(payment.user);
    if (!user) return res.json({ received: true });

    const paymentType = session.metadata?.paymentType ?? payment.paymentType;

    if (paymentType === 'blog') {
      await this.handleUnlockCompleted(session, payment, user, res);
    } else if (paymentType === 'subscription') {
      await this.handleSubscriptionCompleted(session, payment, user, res);
    } else {
      this.logger.warn(
        `Unknown payment type for session ${session.id}: ${paymentType}`,
      );
      return res.json({ received: true });
    }
  }

  // ===============================
  // BLOG UNLOCK COMPLETED
  // ===============================

  private async handleUnlockCompleted(
    session: Stripe.Checkout.Session,
    payment: PaymentDocument,
    user: UserDocument,
    res: Response,
  ) {
    const blogId = payment.blog?.toString() ?? session.metadata?.blogId;
    if (!blogId) return res.json({ received: true });

    const blog = await this.blogModel.findById(blogId);
    if (!blog) return res.json({ received: true });

    payment.blog = blog._id as any;
    payment.paymentType = 'blog';

    if (!payment.amount) {
      payment.amount = Number(session.metadata?.price ?? blog.price ?? 0);
    }

    const adminAmount =
      payment.adminAmount ??
      Number((Number(payment.amount ?? blog.price ?? 0) * 0.1).toFixed(2));
    const authorAmount =
      payment.authorAmount ??
      Number(
        (Number(payment.amount ?? blog.price ?? 0) - adminAmount).toFixed(2),
      );

    payment.adminAmount = adminAmount;
    payment.authorAmount = authorAmount;

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

  private async handleSubscriptionCompleted(
    session: Stripe.Checkout.Session,
    payment: PaymentDocument,
    user: UserDocument,
    res: Response,
  ) {
    const planId = payment.plan?.toString() ?? session.metadata?.planId;
    if (!planId) return res.json({ received: true });

    const plan = await this.subscriptionModel.findById(planId);
    if (!plan) return res.json({ received: true });

    payment.plan = plan._id as any;
    payment.paymentType = 'subscription';
    payment.amount = Number(
      session.metadata?.price ?? payment.amount ?? plan.price,
    );
    payment.adminAmount =
      payment.adminAmount ?? Number((Number(payment.amount) * 0.1).toFixed(2));
    payment.authorAmount =
      payment.authorAmount ??
      Number((Number(payment.amount) - payment.adminAmount).toFixed(2));
    await payment.save();

    const expiryDate = new Date();
    if (plan.duration === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    await this.userSubscriptionModel.findOneAndUpdate(
      {
        user: user._id,
        plan: plan._id,
      } as any,
      {
        user: user._id,
        plan: plan._id,
        expiryDate,
        isActive: true,
      } as any,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
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

  // ===============================
  // SUBSCRIPTION LOGIC
  // ===============================
  // private async handleSubscriptionPayment(
  //   session: Stripe.Checkout.Session,
  //   payment: PaymentDocument,
  //   user: UserDocument,
  //   res: Response,
  // ) {
  //   const subscriber = await this.subscriberModel.findById(payment.subscriber);
  //   if (!subscriber) return res.json({ received: true });

  //   // Add user to subscriber's users array if not already present
  //   const alreadyAdded = subscriber.users?.some((id) => id.equals(user._id));
  //   if (!alreadyAdded) {
  //     subscriber.users = subscriber.users ?? [];
  //     subscriber.users.push(user._id);
  //     await subscriber.save();
  //   }

  //   // Calculate expiry using `days` from metadata
  //   const days = parseInt(session.metadata?.days ?? '0', 10);
  //   const expireDate = new Date();
  //   expireDate.setDate(expireDate.getDate() + days);

  //   user.isSubscribed = true;
  //   user.subscribers = subscriber._id;
  //   user.subscriptionEndDate = expireDate;
  //   await user.save();

  //   return res.json({ received: true });
  // }

  // ===============================
  // PAYMENT FAILED
  // ===============================
  private async handlePaymentFailed(event: Stripe.Event, res: Response) {
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
