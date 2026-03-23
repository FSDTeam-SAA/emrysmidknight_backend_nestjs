import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';

@ApiTags('Comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':blogId')
  @ApiOperation({ summary: 'Create comment' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'blogId',
    type: String,
    example: '',
    description: 'Blog id',
  })
  @ApiBody({ type: CreateCommentDto })
  @UseGuards(AuthGuard('reader'))
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Req() req: Request,
    @Param('blogId') blogId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const readerId = req.user!.id;
    const result = await this.commentService.createComment(
      readerId,
      blogId,
      createCommentDto,
    );

    return {
      message: 'Comment created successfully',
      data: result,
    };
  }

  @Get(':blogId')
  @ApiOperation({ summary: 'Get all comments' })
  @ApiParam({
    name: 'blogId',
    type: String,
    example: '',
    description: 'Blog id',
  })
  @ApiQuery({
    name: 'searchTerm',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'text',
    type: String,
    required: false,
  })
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
  @HttpCode(HttpStatus.OK)
  async getAllComments(@Param('blogId') blogId: string, @Req() req: Request) {
    const filters = pick(req.query, ['searchTerm', 'text']);
    const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);
    const result = await this.commentService.getAllComments(
      blogId,
      filters,
      options,
    );
    return {
      message: 'Comments fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('single/:commentId')
  @ApiOperation({ summary: 'Get single comment' })
  @ApiParam({
    name: 'commentId',
    type: String,
    example: '',
    description: 'Comment id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleComment(@Param('commentId') commentId: string) {
    const result = await this.commentService.getCommentById(commentId);
    return {
      message: 'Comment fetched successfully',
      data: result,
    };
  }
}
