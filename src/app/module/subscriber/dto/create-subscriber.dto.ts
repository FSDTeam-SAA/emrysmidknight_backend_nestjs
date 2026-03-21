import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateSubscriberDto {
  @ApiProperty({ example: 'Premium Monthly Plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 99 })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty({ enum: ['monthly', 'yearly'], example: 'monthly' })
  @IsString()
  duration: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['feature1', 'feature2', 'feature3'],
    description: 'Array of features included in this subscription',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({
    type: [String],
    example: ['blog1', 'blog2', 'blog3'],
    description: 'Array of blog ids included in this subscription',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  blogs: string[];
}
