import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UseGuards,
  UploadedFile,
  Req,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileUpload } from 'src/app/helpers/fileUploder';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'create user',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('profilePicture', fileUpload.uploadConfig))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },

        role: {
          type: 'string',
          enum: ['teacher', 'parent', 'student', 'admin'],
        },

        gender: {
          type: 'string',
          enum: ['male', 'female'],
        },

        phoneNumber: { type: 'string', example: '+8801712345678' },
        bio: { type: 'string', example: 'Math teacher' },

        profilePicture: {
          type: 'string',
          format: 'binary',
        },

        status: {
          type: 'string',
          enum: ['panding', 'active', 'block'],
        },

        dateOfBirth: {
          type: 'string',
          example: '2000-05-10',
        },

        schoolAddress: {
          type: 'string',
          example: 'Dhaka High School',
        },

        relationship: {
          type: 'string',
          example: 'Father',
        },

        otp: { type: 'string' },

        verifiedForget: {
          type: 'boolean',
          example: false,
        },

        stripeAccountId: {
          type: 'string',
          example: 'acct_123456789',
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.userService.createUser(createUserDto, file);

    return {
      message: 'User created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get the all user',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by product name, description, whatWillYouGet, or size',
  })
  @ApiQuery({
    name: 'firstName',
    required: false,
    type: String,
    example: '',
    description: 'Filter by exact firstName',
  })
  @ApiQuery({
    name: 'lastName',
    required: false,
    type: String,
    example: '',
    description: 'Filter by exact description value',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    example: '',
    description: 'Filter by exact email value',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    example: '',
    description: 'Filter by role value',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    type: String,
    example: '',
    description: 'Filter by gender value',
  })
  @ApiQuery({
    name: 'phoneNumber',
    required: false,
    type: String,
    example: '',
    description: 'Filter by phoneNumber value',
  })
  @ApiQuery({
    name: 'bio',
    required: false,
    type: String,
    example: '',
    description: 'Filter by bio value',
  })
  @ApiQuery({
    name: 'schoolAddress',
    required: false,
    type: String,
    example: '',
    description: 'Filter by schoolAddress value',
  })
  @ApiQuery({
    name: 'relationship',
    required: false,
    type: String,
    example: '',
    description: 'Filter by relationship value',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: '',
    description: 'Filter by status value',
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
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getAllUser(@Req() req: Request) {
    const params = pick(req.query, [
      'searchTerm',
      'firstName',
      'lastName',
      'email',
      'role',
      'gender',
      'phoneNumber',
      'bio',
      'schoolAddress',
      'relationship',
      'status',
    ]);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.userService.getAllUser(params, options);

    return {
      message: 'User fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get the profile of the currently authenticated user',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin', 'teacher', 'parent', 'student'))
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: Request) {
    const user = await this.userService.getProfile(req.user!.id);
    return {
      message: 'User fetched successfully',
      data: user,
    };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update the profile of the currently authenticated user',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin', 'teacher', 'parent', 'student'))
  @UseInterceptors(FileInterceptor('profilePicture', fileUpload.uploadConfig))
  @ApiBody({ type: UpdateUserDto })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.userService.updateMyProfile(
      req.user!.id,
      updateUserDto,
      file,
    );
    return {
      message: 'User updated successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single user by id',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'User id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleUser(@Param('id') id: string) {
    const result = await this.userService.getSingleUser(id);

    return {
      message: 'User fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user by id',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('profilePicture', fileUpload.uploadConfig))
  @ApiBody({ type: UpdateUserDto })
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.userService.updateUser(id, updateUserDto, file);

    return {
      message: 'User updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user by id',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'User id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    const result = await this.userService.deleteUser(id);

    return {
      message: 'User deleted successfully',
      data: result,
    };
  }
}
