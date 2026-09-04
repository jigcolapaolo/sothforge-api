import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({
    example: 'We could approach this task differently.',
    description: 'Updated content of the comment.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}
