import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('subscriber')
@Controller('subscriber')
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Post()
  @ApiOperation({
    summary: 'create subscription',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreateSubscriberDto })
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Req() req: Request,
    @Body() createSubscriberDto: CreateSubscriberDto,
  ) {
    const authorId = req.user!.id;
    const result = await this.subscriberService.createSubscription(
      authorId,
      createSubscriberDto,
    );

    return {
      message: 'Subscription created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search by name, duration, or features',
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'duration',
    required: false,
    type: String,
    enum: ['monthly', 'yearly'],
  })
  @ApiQuery({
    name: 'features',
    required: false,
    type: String,
    description: 'Search by a feature value',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAllSubscriptions(@Req() req: Request) {
    const params = pick(req.query, [
      'searchTerm',
      'name',
      'duration',
      'features',
    ]);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.subscriberService.getAllSubscriptions(
      params,
      options,
    );

    return {
      message: 'Subscriptions fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('/author-subscriptions/:authorId')
  @ApiOperation({ summary: 'Get subscriptions by author id' })
  @ApiParam({ name: 'authorId', type: String, description: 'Author id' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search by name, duration, or features',
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'duration',
    required: false,
    type: String,
    enum: ['monthly', 'yearly'],
  })
  @ApiQuery({
    name: 'features',
    required: false,
    type: String,
    description: 'Search by a feature value',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAuthorSubscriptions(
    @Param('authorId') authorId: string,
    @Req() req: Request,
  ) {
    if (!authorId) {
      throw new BadRequestException('authorId param is required');
    }

    const params = pick(req.query, [
      'searchTerm',
      'name',
      'duration',
      'features',
    ]);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.subscriberService.getAuthorSubscriptions(
      authorId,
      params,
      options,
    );

    return {
      message: 'Subscriptions fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('/my-subscriptions')
  @ApiOperation({ summary: 'Get my all subscriptions' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search by name, duration, or features',
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'duration',
    required: false,
    type: String,
    enum: ['monthly', 'yearly'],
  })
  @ApiQuery({
    name: 'features',
    required: false,
    type: String,
    description: 'Search by a feature value',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getMySubscriptions(@Req() req: Request) {
    const authorId = req.user!.id;
    const params = pick(req.query, [
      'searchTerm',
      'name',
      'duration',
      'features',
    ]);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.subscriberService.getMySubscriptions(
      authorId,
      params,
      options,
    );

    return {
      message: 'Subscriptions fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by id' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const result = await this.subscriberService.getSingleSubscription(id);
    return {
      message: 'Subscription fetched successfully',
      data: result,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateSubscriberDto: UpdateSubscriberDto,
  ) {
    const result = await this.subscriberService.updateSubscription(
      req.user!.id,
      id,
      updateSubscriberDto,
    );

    return {
      message: 'Subscription updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const result = await this.subscriberService.deleteSubscription(
      req.user!.id,
      id,
    );
    return {
      message: 'Subscription deleted successfully',
      data: result,
    };
  }
}
