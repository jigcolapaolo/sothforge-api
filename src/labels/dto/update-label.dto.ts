import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({
    example: 'Backend',
    description: 'Updated label name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Updated label color in hexadecimal format',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}
