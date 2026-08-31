import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskPriority } from 'src/generated/prisma/enums';

export class UpdateTaskPriorityDto {
  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsEnum(TaskPriority)
  priority!: TaskPriority;
}
