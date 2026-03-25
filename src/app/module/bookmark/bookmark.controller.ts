import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import type { Request } from 'express';
import AuthGuard from 'src/app/middlewares/auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import pick from 'src/app/helpers/pick';

@ApiTags('Bookmark')
@Controller('bookmark')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Post()
  @ApiOperation({
    summary: 'Create bookmark',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreateBookmarkDto })
  @UseGuards(AuthGuard('author', 'reader'))
  @HttpCode(HttpStatus.CREATED)
  async createBookmark(
    @Req() req: Request,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ) {
    const result = await this.bookmarkService.createBookmark(
      req.user!.id,
      createBookmarkDto,
    );

    return {
      message: 'Bookmark created successfully',
      data: result,
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my bookmarks',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    type: String,
    required: false,
  })
  @UseGuards(AuthGuard('author', 'reader'))
  @HttpCode(HttpStatus.OK)
  async getMyBookmarks(@Req() req: Request) {
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.bookmarkService.getMyBookmarks(
      req.user!.id,
      options,
    );

    return {
      message: 'Bookmarks fetched successfully',
      data: result,
    };
  }

  @Get('single/:bookmarkId')
  @ApiOperation({
    summary: 'Get single bookmark blog',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'blogId',
    type: String,
    example: '',
    description: 'bookmarkId id',
  })
  @UseGuards(AuthGuard('author', 'reader'))
  @HttpCode(HttpStatus.OK)
  async getSingleBookmark(@Param('bookmarkId') bookmarkId: string) {
    const result = await this.bookmarkService.getSingleBookmark(bookmarkId);

    return {
      message: 'Bookmark fetched successfully',
      data: result,
    };
  }

  @Delete(':blogId')
  @ApiOperation({
    summary: 'Remove bookmark',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'blogId',
    type: String,
    example: '',
    description: 'Blog id',
  })
  @UseGuards(AuthGuard('author', 'reader'))
  @HttpCode(HttpStatus.OK)
  async removeBookmark(
    @Req() req: Request,
    @Param('blogId') blogId: string,
  ) {
    const result = await this.bookmarkService.removeBookmark(
      req.user!.id,
      blogId,
    );

    return {
      message: 'Bookmark removed successfully',
      data: result,
    };
  }
}
