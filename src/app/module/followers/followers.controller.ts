import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FollowersService } from './followers.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Followers')
@Controller('followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Get('my-followers')
  @ApiOperation({ summary: 'Get my followers' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by follower or author related text fields',
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
  async getMyFollowers(@Req() req: Request) {
    const filters = pick(req.query, ['searchTerm', 'followers', 'author']);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.followersService.getMyFollowers(
      req.user!.id,
      filters,
      options,
    );
    return {
      message: 'My followers fetched successfully',
      data: result,
    };
  }

  @Post(':authorId')
  @ApiOperation({ summary: 'Create follower' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader', 'author', 'admin'))
  @HttpCode(HttpStatus.CREATED)
  async createFollower(
    @Req() req: Request,
    @Param('authorId') authorId: string,
  ) {
    const result = await this.followersService.createFollower(
      req.user!.id,
      authorId,
    );

    return {
      message: 'Follower created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all followers' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: 'john',
    description: 'Search by follower or author related text fields',
  })
  @ApiQuery({
    name: 'followers',
    required: false,
    type: String,
    example: '',
    description: 'Filter by follower user id',
  })
  @ApiQuery({
    name: 'author',
    required: false,
    type: String,
    example: '',
    description: 'Filter by author user id',
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
  @HttpCode(HttpStatus.OK)
  async getAllFollowers(@Req() req: Request) {
    const filters = pick(req.query, ['searchTerm', 'followers', 'author']);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.followersService.allFlowers(filters, options);
    return {
      message: 'Followers fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get follower by id' })
  @HttpCode(HttpStatus.OK)
  async getFollowerById(@Param('id') id: string) {
    const result = await this.followersService.getFollowerById(id);
    return {
      message: 'Follower fetched successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unfollow by follower id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader', 'author', 'admin'))
  @HttpCode(HttpStatus.OK)
  async unfollow(@Req() req: Request, @Param('id') id: string) {
    const result = await this.followersService.unfollow(req.user!.id, id);

    return {
      message: 'Unfollow successful',
      data: result,
    };
  }
}
