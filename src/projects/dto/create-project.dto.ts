import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Website Redesign',
    description: 'Name of the project',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Redesign of the company website and user experience',
    description: 'Optional description of the project',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Optional project start date in ISO 8601 format',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-15T00:00:00.000Z',
    description: 'Optional project end date in ISO 8601 format',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
