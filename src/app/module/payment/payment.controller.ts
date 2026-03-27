import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('my-payments')
  @ApiOperation({ summary: 'Get my payments' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by payment related text fields',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number. Default is 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page. Default is 10',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
    description: 'Sort field. Default is createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort order. Default is desc',
  })
  @UseGuards(AuthGuard('reader', 'author', 'admin'))
  @HttpCode(HttpStatus.OK)
  async getMyPayments(@Req() req: Request) {
    const filters = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.paymentService.getMyPayments(
      req.user!.id,
      filters,
      options,
    );

    return {
      message: 'My payments fetched successfully',
      data: result,
    };
  }

  @Post('unlock-blog/:blogId')
  @ApiOperation({ summary: 'Unlock blog' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async unlockBlog(@Req() req: Request, @Param('blogId') blogId: string) {
    const result = await this.paymentService.unlockBlog(req.user!.id, blogId);

    return {
      message: 'Blog unlocked successfully',
      data: result,
    };
  }

  @Post('subscribe/:planId')
  @ApiOperation({ summary: 'Subscribe to an author plan' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async subscribeToPlan(@Req() req: Request, @Param('planId') planId: string) {
    const result = await this.paymentService.subscribeToPlan(
      req.user!.id,
      planId,
    );

    return {
      message: 'Subscription payment session created successfully',
      data: result,
    };
  }
}
