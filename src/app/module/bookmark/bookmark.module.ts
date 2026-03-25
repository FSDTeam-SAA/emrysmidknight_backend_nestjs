import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Bookmark, BookmarkSchema } from './entities/bookmark.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { Blog, BlogSchema } from '../blog/entities/blog.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
      { name: User.name, schema: UserSchema },
      { name: Blog.name, schema: BlogSchema },
    ]),
  ],
  controllers: [BookmarkController],
  providers: [BookmarkService],
})
export class BookmarkModule {}
