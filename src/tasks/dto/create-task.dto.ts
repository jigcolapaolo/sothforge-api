import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TaskPriority } from 'src/generated/prisma/enums';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Implement authentication',
  })
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    example: 'Create JWT authentication and refresh token flow',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '2026-09-15T18:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    example: 8,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'ID of the user to assign to the task',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
