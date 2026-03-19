import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBlogDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  audio?: any;

  @ApiPropertyOptional({ example: '' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  attachment?: any;

  @ApiPropertyOptional({ example: '' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: '' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: '' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'free', enum: ['free', 'paid'] })
  @IsOptional()
  @IsString()
  audienceType?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;
}
