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
  ApiQuery,
} from '@nestjs/swagger';
import pick from 'src/app/helpers/pick';

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

    return {
      message: 'Blog created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all blogs' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search keywords',
  })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'content', required: false, type: String })
  @ApiQuery({
    name: 'audienceType',
    required: false,
    type: String,
    description: 'E.g., free, paid',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
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
  @UseGuards(AuthGuard('author'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search keywords',
  })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'content', required: false, type: String })
  @ApiQuery({
    name: 'audienceType',
    required: false,
    type: String,
    description: 'E.g., free, paid',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
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

  @Get('reader/access/:id')
  @ApiOperation({
    summary: 'Get blog details for a reader with free/paid/subscription access check',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('reader', 'author'))
  @HttpCode(HttpStatus.OK)
  async getAccessibleBlog(@Req() req: Request, @Param('id') id: string) {
    const result = await this.blogService.singleBlogPardFree(req.user!.id, id);
    return {
      message: 'Blog fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a blog by id' })
  @HttpCode(HttpStatus.OK)
  async getBlogById(@Param('id') id: string) {
    const result = await this.blogService.getSingleBlog(id);
    return {
      message: 'Blog fetched successfully',
      data: result,
    };
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
    return {
      message: 'Blog updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('author'))
  @HttpCode(HttpStatus.OK)
  async deleteBlog(@Param('id') id: string) {
    const result = await this.blogService.deleteBlog(id);
    return {
      message: 'Blog deleted successfully',
      data: result,
    };
  }
}
