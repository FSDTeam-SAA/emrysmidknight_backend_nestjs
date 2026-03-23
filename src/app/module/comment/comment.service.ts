import { HttpException, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, CommentDocument } from './entities/comment.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) {}

  async createComment(
    readerId: string,
    blogId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const reader = await this.userModel.findById(readerId);
    if (!reader) throw new HttpException('User not found', 404);

    const blogCheck = await this.blogModel.findById(blogId);
    if (!blogCheck) throw new HttpException('Blog not found', 404);

    const result = await this.commentModel.create({
      ...createCommentDto,
      user: reader._id,
      blog: blogCheck._id,
    });

    await this.userModel.findByIdAndUpdate(reader._id, {
      $addToSet: { comments: result._id },
    });

    await this.blogModel.findByIdAndUpdate(blogCheck._id, {
      $addToSet: { comments: result._id },
    });

    return result;
  }

  async getAllComments(
    blogId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const blogCheck = await this.blogModel.findById(blogId);
    if (!blogCheck) throw new HttpException('Blog not found', 404);

    const commentSearchAbleFields = ['text'];
    const whereConditions = buildWhereConditions(
      params,
      commentSearchAbleFields,
      {
        blog: blogCheck._id,
      },
    );
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.commentModel.countDocuments(whereConditions);
    const result = await this.commentModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);
    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
    };
  }

  async getCommentById(id: string) {
    const result = await this.commentModel.findById(id);
    if (!result) throw new HttpException('Comment not found', 404);
    return result;
  }

  async updateMyComment(
    reanderId: string,
    id: string,
    updateCommentDto: UpdateCommentDto,
  ) {
    const reader = await this.userModel.findById(reanderId);
    if (!reader) throw new HttpException('User not found', 404);
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new HttpException('Comment not found', 404);
    if (comment.user.toString() !== reanderId)
      throw new HttpException(
        'You are not allowed to update this comment',
        403,
      );
    const result = await this.commentModel.findOneAndUpdate(
      { _id: id, user: reanderId },
      updateCommentDto,
      { new: true },
    );
    if (!result) throw new HttpException('Comment not found', 404);
    return result;
  }

  async deleteMyComment(reanderId: string, id: string) {
    const reader = await this.userModel.findById(reanderId);
    if (!reader) throw new HttpException('User not found', 404);
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new HttpException('Comment not found', 404);
    if (comment.user.toString() !== reanderId)
      throw new HttpException(
        'You are not allowed to delete this comment',
        403,
      );
    const result = await this.commentModel.findByIdAndDelete(id);
    if (!result) throw new HttpException('Comment not found', 404);
    return result;
  }
}
