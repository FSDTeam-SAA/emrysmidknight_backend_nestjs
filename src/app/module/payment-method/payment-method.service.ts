import { HttpException, Injectable } from '@nestjs/common';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  PaymentMethod,
  PaymentMethodDocument,
} from './entities/payment-method.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { Model } from 'mongoose';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private readonly paymentMethodModel: Model<PaymentMethodDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private parseExpiryDate(expiryDate: string) {
    const [monthText, yearText] = expiryDate.split('/');
    const expiryMonth = Number(monthText);
    const twoDigitYear = Number(yearText);
    const expiryYear = 2000 + twoDigitYear;

    if (
      !Number.isInteger(expiryMonth) ||
      !Number.isInteger(expiryYear) ||
      expiryMonth < 1 ||
      expiryMonth > 12
    ) {
      throw new HttpException('Expiry date must be in MM/YY format', 400);
    }

    return { expiryMonth, expiryYear };
  }

  private detectCardBrand(cardNumber: string) {
    const normalized = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(normalized)) return 'visa';
    if (/^5[1-5]/.test(normalized)) return 'mastercard';
    if (/^3[47]/.test(normalized)) return 'amex';
    if (/^6(?:011|5)/.test(normalized)) return 'discover';
    return 'unknown';
  }

  async createPaymentMethod(
    userId: string,
    createPaymentMethodDto: CreatePaymentMethodDto,
  ) {
    const { cardBrand, cardNumber, expiryDate, cardHolderName } =
      createPaymentMethodDto;

    const user = await this.userModel.exists({ _id: userId });
    if (!user) throw new HttpException('User not found', 404);

    const normalizedCardNumber = cardNumber.replace(/\s+/g, '');
    const { expiryMonth, expiryYear } = this.parseExpiryDate(expiryDate);

    const existingMethod = await this.paymentMethodModel.findOne({
      userId,
      cardNumber: normalizedCardNumber,
      expiryMonth,
      expiryYear,
    });

    if (existingMethod) {
      return {
        message: 'Payment method already saved',
        data: existingMethod,
      };
    }

    const payload = {
      userId,
      cardBrand: cardBrand ?? this.detectCardBrand(normalizedCardNumber),
      cardNumber: normalizedCardNumber,
      expiryMonth,
      expiryYear,
      cardHolderName: cardHolderName ?? '',
    };

    const result = await this.paymentMethodModel.create(payload);
    return {
      message: 'Payment method saved successfully',
      data: result,
    };
  }

  async findAllPaymentMethods(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);

    const whereConditions = buildWhereConditions(
      params,
      ['cardBrand', 'cardNumber', 'cardHolderName'],
      { userId },
    );

    const result = await this.paymentMethodModel
      .find(whereConditions)
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit);

    const total = await this.paymentMethodModel.countDocuments(whereConditions);

    return {
      message: 'Payment methods fetched successfully',
      data: result,
      meta: { total, page, limit },
    };
  }

  async findOnePaymentMethod(userId: string, id: string) {
    const paymentMethod = await this.paymentMethodModel.findOne({
      _id: id,
      userId,
    });
    if (!paymentMethod)
      throw new HttpException('Payment method not found', 404);
    return paymentMethod;
  }

  async removePaymentMethod(userId: string, id: string) {
    const paymentMethod = await this.paymentMethodModel.findOne({
      _id: id,
      userId,
    });
    if (!paymentMethod)
      throw new HttpException('Payment method not found', 404);

    await paymentMethod.deleteOne();
    return { message: 'Payment method deleted successfully' };
  }
}
