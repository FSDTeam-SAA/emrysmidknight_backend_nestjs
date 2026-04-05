import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import AuthGuard from 'src/app/middlewares/auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview cards and monthly earnings chart for the logged-in author',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2026 })
  @ApiQuery({ name: 'month', required: false, type: Number, example: 4 })
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @Req() req: Request,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    const result = await this.dashboardService.getOverview(
      req.user!.id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );

    return {
      message: 'Dashboard overview fetched successfully',
      data: result,
    };
  }
}
