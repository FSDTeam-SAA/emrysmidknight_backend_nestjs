import { Schema } from '@nestjs/mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

@Schema({ timestamps: true })
export class CreateFollowerDto {
  @ApiPropertyOptional({ example: '' })
  @IsMongoId()
  @IsOptional()
  followers: string;

  @IsMongoId()
  @IsOptional()
  reader: string;
}
