import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'We could do this task this way...',
    description: 'Content of the comment.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
