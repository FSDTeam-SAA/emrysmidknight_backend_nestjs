import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateBookmarkDto {
  @ApiPropertyOptional({ example: '' })
  @IsString()
  blog: string;
}
