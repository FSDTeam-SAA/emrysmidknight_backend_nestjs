import { HttpException, Injectable } from '@nestjs/common';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Bookmark, BookmarkDocument } from './entities/bookmark.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Blog, BlogDocument } from '../blog/entities/blog.entity';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectModel(Bookmark.name) private bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) {}

  async createBookmark(userId: string, createBookmarkDto: CreateBookmarkDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);

    const blog = await this.blogModel.findById(createBookmarkDto.blog);
    if (!blog) throw new HttpException('Blog not found', 404);

    const result = await this.bookmarkModel.create({
      blog: blog._id,
      user: user._id,
    });

    return result;
  }

  async getMyBookmarks(userId: string, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);
    const result = await this.bookmarkModel
      .find({ user: user._id })
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .populate('blog');
    return result;
  }

  async getSingleBookmark(BookmarId: string) {
    const result = await this.bookmarkModel
      .findById(BookmarId)
      .populate('blog');
    if (!result) throw new HttpException('Bookmark not found', 404);
    return result;
  }

  async removeBookmark(userId: string, blogId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new HttpException('User not found', 404);
    const blog = await this.blogModel.findById(blogId);
    if (!blog) throw new HttpException('Blog not found', 404);
    const result = await this.bookmarkModel.deleteOne({
      blog: blog._id,
      user: user._id,
    });
    return result;
  }
}
