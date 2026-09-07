import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LabelQueryDto {
  @ApiPropertyOptional({
    example: 'backend',
    description: 'Search labels by name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
