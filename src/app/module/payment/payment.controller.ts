import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
