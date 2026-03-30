// blog.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import AuthGuard from 'src/app/middlewares/auth.guard';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import pick from 'src/app/helpers/pick';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new blog' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 3 },
      { name: 'audio', maxCount: 3 },
      { name: 'attachment', maxCount: 3 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async createBlog(
    @Req() req: Request,
    @Body() createBlogDto: CreateBlogDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      attachment?: Express.Multer.File[];
    },
  ) {
    const userId = req.user!.id;
    const result = await this.blogService.createBlog(
      userId,
      createBlogDto,
      files,
    );
    return { message: 'Blog created successfully', data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get all blogs' })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'content', required: false, type: String })
  @ApiQuery({ name: 'audienceType', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAllBlogs(@Req() req: Request) {
    const params = pick(req.query, [
      'searchTerm',
      'title',
      'content',
      'audienceType',
      'category',
    ]);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.blogService.getAllBlogs(params, options);
    return {
      message: 'Blogs fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('/my-blogs')
  @ApiOperation({ summary: 'Get my all blogs' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'content', required: false, type: String })
  @ApiQuery({ name: 'audienceType', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAllMyBlogs(@Req() req: Request) {
    const userId = req.user!.id;
    const params = pick(req.query, [
      'searchTerm',
      'title',
      'content',
      'audienceType',
      'category',
    ]);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.blogService.getAllMyBlogs(
      userId,
      params,
      options,
    );
    return {
      message: 'Blogs fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('/trending-story')
  @ApiOperation({ summary: 'Get all trending stories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAllTrendingStory(@Req() req: Request) {
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.blogService.getAllTrendingStory(options);
    return {
      message: 'Trending story fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('/blogs-with-lock-status')
  @ApiOperation({
    summary: 'Get all blogs with lock/unlock status for logged-in user',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author', 'reader'))
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getBlogsWithLockStatus(@Req() req: Request) {
    const userId = req.user!.id;
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.blogService.getBlogsWithLockStatus(
      userId,
      options,
    );
    return {
      message: 'Blogs fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('reader/access/:id')
  @ApiOperation({
    summary: 'Get blog details with free/paid/subscription access check',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader', 'author'))
  @HttpCode(HttpStatus.OK)
  async getAccessibleBlog(@Req() req: Request, @Param('id') id: string) {
    const result = await this.blogService.singleBlogPardFree(req.user!.id, id);
    return { message: 'Blog fetched successfully', data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a blog by id' })
  @HttpCode(HttpStatus.OK)
  async getBlogById(@Param('id') id: string) {
    const result = await this.blogService.getSingleBlog(id);
    return { message: 'Blog fetched successfully', data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a blog by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 3 },
      { name: 'audio', maxCount: 3 },
      { name: 'attachment', maxCount: 3 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  async updateBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      attachment?: Express.Multer.File[];
    },
  ) {
    const result = await this.blogService.updateBlog(id, updateBlogDto, files);
    return { message: 'Blog updated successfully', data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.OK)
  async deleteBlog(@Param('id') id: string) {
    const result = await this.blogService.deleteBlog(id);
    return { message: 'Blog deleted successfully', data: result };
  }

  @Post(':id/like-unlike')
  @ApiOperation({ summary: 'Like or unlike a blog' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', type: String, description: 'Blog id' })
  @UseGuards(AuthGuard('author', 'reader'))
  @HttpCode(HttpStatus.OK)
  async likeUnlikeBlog(@Req() req: Request, @Param('id') id: string) {
    const result = await this.blogService.likeUnlikeBlog(req.user!.id, id);
    return {
      message: result.liked
        ? 'Blog liked successfully'
        : 'Blog unliked successfully',
      data: result.blog,
    };
  }
}
