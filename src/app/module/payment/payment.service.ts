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
  ) {
    this.stripe = new Stripe(config.stripe.secretKey!);
  }

  async unlockBlog(userId: string, blogId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new HttpException('user is not found', 404);

    const blog = await this.blogModel.findById(blogId);

    if (!blog) throw new HttpException('Blog is not found', 404);
  }
}
