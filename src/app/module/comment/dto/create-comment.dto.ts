import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'This blog was really helpful.',
    description: 'Comment text',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
