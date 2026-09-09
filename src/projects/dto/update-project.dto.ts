import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ProjectStatus } from 'src/generated/prisma/enums';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Website Redesign',
    description: 'New name for the project',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated project description',
    description: 'New description of the project',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    example: ProjectStatus.PLANNING,
    description: 'Current status of the project',
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    example: '2026-09-01T00:00:00.000Z',
    description: 'New project start date in ISO 8601 format',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-15T00:00:00.000Z',
    description: 'New project end date in ISO 8601 format',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
