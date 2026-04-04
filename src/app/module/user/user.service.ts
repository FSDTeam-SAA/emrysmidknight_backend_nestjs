import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import Stripe from 'stripe';
import config from 'src/app/config';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import {
  Follower,
  FollowerDocument,
} from '../followers/entities/follower.entity';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriber/entities/subscriber.entity';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../user-subscription/entities/user-subscription.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';

const userSearchAbleFields = [
  'firstName',
  'lastName',
  'email',
  'role',
  'gender',
  'phoneNumber',
  'bio',
  'schoolAddress',
  'relationship',
  'status',
];

@Injectable()
export class UserService {
  private stripe: Stripe;
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    @InjectModel(Follower.name)
    private readonly followerModel: Model<FollowerDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {
    this.stripe = new Stripe(config.stripe.secretKey!);
  }

  private getContentPreview(content?: string, previewLength = 220) {
    if (!content) return '';
    if (content.length <= previewLength) return content;
    return `${content.slice(0, previewLength).trim()}...`;
  }

  private getBlogUnlockReason({
    isOwner,
    isFree,
    isPurchased,
    isSubscribed,
  }: {
    isOwner: boolean;
    isFree: boolean;
    isPurchased: boolean;
    isSubscribed: boolean;
  }) {
    if (isOwner) return 'owner';
    if (isFree) return 'free';
    if (isPurchased) return 'purchased';
    if (isSubscribed) return 'subscription';
    return 'locked';
  }

  private getStripeRefreshUrl() {
    return `${config.frontendUrl}/connect/refresh`;
  }

  private getStripeReturnUrl() {
    return `${config.frontendUrl}/stripe-account-success`;
  }

  private async createOnboardingLink(accountId: string) {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: this.getStripeRefreshUrl(),
      return_url: this.getStripeReturnUrl(),
      type: 'account_onboarding',
    });
  }

  async createUser(
    createUserDto: CreateUserDto,
    file?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ) {
    const user = await this.userModel.findOne({ email: createUserDto.email });
    if (user) {
      throw new HttpException('User already exists', 400);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      createUserDto.profilePicture = uploadedFile.url;
    }
    if (coverFile) {
      const uploadedFile = await fileUpload.uploadToCloudinary(coverFile);
      createUserDto.coverPicture = uploadedFile.url;
    }
    const createdUser = await this.userModel.create(createUserDto);
    return createdUser;
  }

  async getAllUser(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, userSearchAbleFields);

    const total = await this.userModel.countDocuments(whereConditions);
    const users = await this.userModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }

  async getSingleUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateUserDto.profilePicture = uploadedFile.url;
    }
    if (coverFile) {
      const uploadedFile = await fileUpload.uploadToCloudinary(coverFile);
      updateUserDto.coverPicture = uploadedFile.url;
    }
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true },
    );
    return updatedUser;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    const result = await this.userModel.findByIdAndDelete(id);
    return result;
  }

  async getProfile(id: string) {
    const result = await this.userModel.findById(id);
    if (!result) {
      throw new HttpException('User not found', 404);
    }
    return result;
  }

  async updateMyProfile(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateUserDto.profilePicture = uploadedFile.url;
    }
    if (coverFile) {
      const uploadedFile = await fileUpload.uploadToCloudinary(coverFile);
      updateUserDto.coverPicture = uploadedFile.url;
    }
    const result = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
    return result;
  }

  async authorStripeAccount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    if (user.stripeAccountId) {
      return this.getAuthorStripeAccount(userId);
    }

    const nameParts = (user.fullName ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const account = await this.stripe.accounts.create({
      type: 'express',
      email: user.email,
      business_type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        email: user.email,
      },
      business_profile: {
        name: 'emrysmidknight',
        product_description: 'blogging website',
        url: config.frontendUrl,
      },
      settings: {
        payments: {
          statement_descriptor: 'EMRYSMIDKNIGHT',
        },
      },
    });

    if (!account)
      throw new HttpException('Failed to create Stripe account', 500);

    user.stripeAccountId = account.id;
    await user.save();

    const accountLink = await this.createOnboardingLink(account.id);

    return {
      accountId: account.id,
      onboardingComplete: false,
      url: accountLink.url,
      message: 'Stripe onboarding link created successfully',
    };
  }

  async getAuthorStripeAccount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    if (!user.stripeAccountId) {
      throw new HttpException(
        'No Stripe account found. Please create one first via POST /user/stripe-account.',
        400,
      );
    }

    let account: Stripe.Response<Stripe.Account>;
    try {
      account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    } catch (error: any) {
      if (error?.code === 'resource_missing') {
        user.stripeAccountId = '';
        await user.save();
        throw new HttpException(
          'Stored Stripe account was not found. Please create it again.',
          400,
        );
      }

      throw new HttpException(
        error?.message || 'Failed to retrieve Stripe account',
        500,
      );
    }

    if ('deleted' in account && account.deleted) {
      user.stripeAccountId = '';
      await user.save();
      throw new HttpException(
        'Stored Stripe account is no longer available. Please create it again.',
        400,
      );
    }

    const onboardingComplete = Boolean(
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled,
    );

    if (!onboardingComplete) {
      const accountLink = await this.createOnboardingLink(user.stripeAccountId);
      return {
        onboardingComplete: false,
        accountId: user.stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        url: accountLink.url,
        message: 'Stripe onboarding is incomplete. Please complete it.',
      };
    }

    const loginLink = await this.stripe.accounts.createLoginLink(
      user.stripeAccountId,
    );

    return {
      onboardingComplete: true,
      accountId: user.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      url: loginLink.url,
      message: 'Stripe account retrieved successfully',
    };
  }

  async topAuthors(options: IOptions) {
    const { limit, page, skip } = paginationHelper(options);
    const whereConditions = {
      role: 'author',
    };

    const total = await this.userModel.countDocuments(whereConditions);
    const users = await this.userModel.aggregate([
      {
        $match: whereConditions,
      },
      {
        $addFields: {
          followersReadersCount: {
            $size: {
              $ifNull: ['$followersReaders', []],
            },
          },
        },
      },
      {
        $sort: {
          followersReadersCount: -1,
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }

  async getAuthorProfile(
    authorId: string,
    params: IFilterParams,
    options: IOptions,
    viewerId?: string,
  ) {
    const author = await this.userModel.findById(authorId).lean();
    if (!author || author.role !== 'author') {
      throw new HttpException('Author not found', 404);
    }

    const blogSearchAbleFields = [
      'title',
      'content',
      'audienceType',
      'category',
    ];
    const whereConditions = buildWhereConditions(params, blogSearchAbleFields, {
      author: new Types.ObjectId(authorId),
    });
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);

    const [
      totalBlogs,
      freeBlogs,
      paidBlogs,
      totalFollowers,
      filteredBlogsTotal,
      plans,
      blogs,
    ] = await Promise.all([
        this.blogModel.countDocuments({ author: author._id } as any),
        this.blogModel.countDocuments({
          author: author._id,
          audienceType: 'free',
        } as any),
        this.blogModel.countDocuments({
          author: author._id,
          audienceType: 'paid',
        } as any),
        this.followerModel.countDocuments({ author: author._id }),
        this.blogModel.countDocuments(whereConditions),
        this.subscriptionModel
          .find({ author: author._id })
          .sort({ createdAt: -1 })
          .lean(),
        this.blogModel
          .find(whereConditions)
          .skip(skip)
          .limit(limit)
          .sort({ [sortBy]: sortOrder } as any)
          .populate('author')
          .lean(),
      ]);

    const viewerIsOwner = Boolean(viewerId && viewerId === authorId);
    const viewerState = {
      isOwner: viewerIsOwner,
      role: viewerIsOwner ? 'author' : null,
      isFollowing: false,
      followStatus: 'unfollow',
      followAction: 'follow',
      hasActiveSubscription: false,
      subscriptionStatus: 'not_subscribed',
      subscriptionAction: 'subscribe',
    };

    const blogIds = blogs.map((blog) => blog._id.toString());
    const authorPlanIds = plans.map((plan) => plan._id.toString());

    let purchasedBlogIds = new Set<string>();
    let subscribedBlogIds = new Set<string>();
    let activePlanIds = new Set<string>();

    if (viewerId && !viewerIsOwner) {
      const viewer = await this.userModel.findById(viewerId).lean();

      if (viewer) {
        viewerState.role = viewer.role;
        const now = new Date();
        await this.userSubscriptionModel.updateMany(
          {
            user: viewer._id,
            isActive: true,
            expiryDate: { $lt: now },
          } as any,
          { $set: { isActive: false } },
        );

        const [followRelation, activeSubscriptions, payments] =
          await Promise.all([
            this.followerModel.findOne({
              author: author._id,
              followers: viewer._id,
            }),
            authorPlanIds.length
              ? this.userSubscriptionModel
                  .find({
                    user: viewer._id,
                    plan: { $in: authorPlanIds },
                    isActive: true,
                    expiryDate: { $gt: now },
                  } as any)
                  .lean()
              : Promise.resolve([]),
            blogIds.length
              ? this.paymentModel
                  .find({
                    user: viewer._id,
                    blog: { $in: blogIds },
                    paymentType: 'blog',
                    status: 'completed',
                  } as any)
                  .lean()
              : Promise.resolve([]),
          ]);

        viewerState.isFollowing = Boolean(followRelation);
        viewerState.followStatus = followRelation ? 'follow' : 'unfollow';
        viewerState.followAction = followRelation ? 'unfollow' : 'follow';
        activePlanIds = new Set(
          activeSubscriptions.map((subscription) => subscription.plan.toString()),
        );
        viewerState.hasActiveSubscription = activePlanIds.size > 0;
        viewerState.subscriptionStatus =
          activePlanIds.size > 0 ? 'subscribed' : 'not_subscribed';
        viewerState.subscriptionAction =
          activePlanIds.size > 0 ? 'subscribed' : 'subscribe';
        purchasedBlogIds = new Set(
          payments.map((payment) => payment.blog?.toString()).filter(Boolean),
        );
        subscribedBlogIds = new Set(
          plans
            .filter((plan) => activePlanIds.has(plan._id.toString()))
            .flatMap((plan) => plan.blogs.map((blogId) => blogId.toString())),
        );
      }
    }

    const data = blogs.map((blog) => {
      const blogId = blog._id.toString();
      const isFree = blog.audienceType === 'free';
      const isPurchased = viewerIsOwner ? false : purchasedBlogIds.has(blogId);
      const isSubscribed = viewerIsOwner
        ? false
        : subscribedBlogIds.has(blogId);
      const isLocked =
        !viewerIsOwner && !isFree && !isPurchased && !isSubscribed;
      const isUnlocked = !isLocked;
      const unlockReason = this.getBlogUnlockReason({
        isOwner: viewerIsOwner,
        isFree,
        isPurchased,
        isSubscribed,
      });

      return {
        ...blog,
        content: isLocked ? null : blog.content,
        previewContent: this.getContentPreview(blog.content),
        isLocked,
        isUnlocked,
        isPurchased,
        isSubscribed,
        accessType: isLocked ? 'locked' : 'unlocked',
        unlockReason,
        subscriptionStatus: isSubscribed ? 'subscribed' : 'not_subscribed',
        unlockAction: isLocked ? 'unlock' : 'view',
      };
    });

    return {
      author: {
        _id: author._id,
        fullName: author.fullName,
        userName: author.userName,
        email: author.email,
        role: author.role,
        pronounce: author.pronounce,
        gender: author.gender,
        phoneNumber: author.phoneNumber,
        bio: author.bio,
        profilePicture: author.profilePicture,
        coverPicture: author.coverPicture,
        dateOfBirth: author.dateOfBirth,
        createdAt: (author as any).createdAt,
        updatedAt: (author as any).updatedAt,
      },
      stats: {
        totalBlogs,
        freeBlogs,
        paidBlogs,
        lockedBlogs: paidBlogs,
        totalFollowers,
        totalPlans: plans.length,
      },
      viewer: viewerState,
      subscriptionPlans: plans.map((plan) => ({
        ...plan,
        blogsCount: plan.blogs.length,
        isSubscribed: activePlanIds.has(plan._id.toString()),
        subscriptionStatus: activePlanIds.has(plan._id.toString())
          ? 'subscribed'
          : 'not_subscribed',
        subscriptionAction: activePlanIds.has(plan._id.toString())
          ? 'subscribed'
          : 'subscribe',
      })),
      blogs: {
        meta: {
          page,
          limit,
          total: filteredBlogsTotal,
        },
        data,
      },
    };
  }
}
