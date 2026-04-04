import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserSubscriptionService } from './user-subscription.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';

@ApiTags('user-subscription')
@Controller('user-subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @Get('my-active')
  @ApiOperation({ summary: 'Get my active subscriptions' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async getMyActiveSubscriptions(@Req() req: Request) {
    const result = await this.userSubscriptionService.getMyActiveSubscriptions(
      req.user!.id,
    );

    return {
      message: 'Active subscriptions fetched successfully',
      data: result,
    };
  }

  @Get('blog-access/:blogId')
  @ApiOperation({
    summary: 'Check whether the authenticated reader can access a blog',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async checkBlogAccess(@Req() req: Request, @Param('blogId') blogId: string) {
    const result = await this.userSubscriptionService.checkBlogAccess(
      req.user!.id,
      blogId,
    );

    return {
      message: 'Blog access checked successfully',
      data: result,
    };
  }

  @Get('blog-purchase-options/:blogId')
  @ApiOperation({
    summary:
      'Get purchase options for a paid blog including single unlock and subscription plans',
  })
  @ApiParam({ name: 'blogId', type: String, description: 'Blog id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.OK)
  async getBlogPurchaseOptions(
    @Req() req: Request,
    @Param('blogId') blogId: string,
  ) {
    const result = await this.userSubscriptionService.getBlogPurchaseOptions(
      req.user!.id,
      blogId,
    );

    return {
      message: 'Blog purchase options fetched successfully',
      data: result,
    };
  }
}
