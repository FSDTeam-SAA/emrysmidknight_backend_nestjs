import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import Stripe from 'stripe';
import config from 'src/app/config';

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
  private readonly frontendBaseUrl: string;
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    this.stripe = new Stripe(config.stripe.secretKey!);
    this.frontendBaseUrl = this.normalizeFrontendUrl(config.frontendUrl);
  }

  private normalizeFrontendUrl(url?: string) {
    const raw = (url ?? '').trim();
    if (!raw) {
      throw new HttpException(
        'FRONTEND_URL is missing. Please set a valid http/https URL.',
        500,
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new HttpException(
        'FRONTEND_URL is invalid. Example: http://localhost:3000',
        500,
      );
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new HttpException(
        'FRONTEND_URL must start with http:// or https://',
        500,
      );
    }

    return parsed.origin;
  }

  private getStripeRefreshUrl() {
    return `${this.frontendBaseUrl}/connect/refresh`;
  }

  private getStripeReturnUrl() {
    return `${this.frontendBaseUrl}/stripe-account-success`;
  }

  private getStripeBusinessProfileUrl() {
    const parsed = new URL(this.frontendBaseUrl);
    const localHosts = ['localhost', '127.0.0.1', '::1'];
    if (localHosts.includes(parsed.hostname)) return undefined;
    return parsed.toString();
  }

  private async createOnboardingLink(accountId: string) {
    try {
      return await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: this.getStripeRefreshUrl(),
        return_url: this.getStripeReturnUrl(),
        type: 'account_onboarding',
      });
    } catch (error: any) {
      this.logger.error(
        `Stripe account link error: ${error?.message || 'unknown error'}`,
      );
      throw new HttpException(
        error?.message || 'Failed to create Stripe onboarding link',
        500,
      );
    }
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

  async authorStripeAccount(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new HttpException('Email is required', 400);

    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (!user) throw new HttpException('User not found', 404);
    if (user.role !== 'author') {
      throw new HttpException('Only author accounts can create Stripe account', 400);
    }

    if (user.stripeAccountId) {
      return this.getAuthorStripeAccount(user._id.toString());
    }

    const nameParts = (user.fullName ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const businessProfileUrl = this.getStripeBusinessProfileUrl();
    const accountCreateParams: Stripe.AccountCreateParams = {
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
      },
      settings: {
        payments: {
          statement_descriptor: 'EMRYSMIDKNIGHT',
        },
      },
    };
    if (businessProfileUrl) {
      accountCreateParams.business_profile = {
        ...accountCreateParams.business_profile,
        url: businessProfileUrl,
      };
    }

    let account: Stripe.Response<Stripe.Account>;
    try {
      account = await this.stripe.accounts.create(accountCreateParams);
    } catch (error: any) {
      this.logger.error(
        `Stripe account create error: ${error?.message || 'unknown error'}`,
      );
      throw new HttpException(
        error?.message || 'Failed to create Stripe account',
        500,
      );
    }

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
}
