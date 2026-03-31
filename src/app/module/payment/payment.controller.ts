import {
  Body,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';
import { IsOptional, IsString } from 'class-validator';

class PayWithMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  savedMethodId?: string; // optional: MongoDB _id of a PaymentMethod doc
}

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // GET /payment/my-payments
  @Get('my-payments')
  @ApiOperation({ summary: 'Get my payments' })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'paymentType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @UseGuards(AuthGuard('reader', 'author', 'admin'))
  @HttpCode(HttpStatus.OK)
  async getMyPayments(@Req() req: Request) {
    const filters = pick(req.query, ['searchTerm', 'paymentType', 'status']);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.paymentService.getMyPayments(
      req.user!.id,
      filters,
      options,
    );
    return { message: 'My payments fetched successfully', data: result };
  }

  // POST /payment/unlock-blog/:blogId
  @Post('unlock-blog/:blogId')
  @ApiOperation({
    summary:
      'Create PaymentIntent to unlock a paid blog. Pass savedMethodId in body to use a saved card.',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: PayWithMethodDto, required: false })
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async unlockBlog(
    @Req() req: Request,
    @Param('blogId') blogId: string,
    @Body() body: PayWithMethodDto,
  ) {
    const result = await this.paymentService.unlockBlog(
      req.user!.id,
      blogId,
      body?.savedMethodId,
    );
    return { message: 'PaymentIntent created successfully', data: result };
  }

  // POST /payment/subscribe/:planId
  @Post('subscribe/:planId')
  @ApiOperation({
    summary:
      'Create PaymentIntent to subscribe to an author plan. Pass savedMethodId in body to use a saved card.',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: PayWithMethodDto, required: false })
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async subscribeToPlan(
    @Req() req: Request,
    @Param('planId') planId: string,
    @Body() body: PayWithMethodDto,
  ) {
    const result = await this.paymentService.subscribeToPlan(
      req.user!.id,
      planId,
      body?.savedMethodId,
    );
    return {
      message: 'Subscription PaymentIntent created successfully',
      data: result,
    };
  }
}
