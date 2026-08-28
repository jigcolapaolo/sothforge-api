import { IsEnum } from 'class-validator';
import { TaskPriority } from 'src/generated/prisma/enums';

export class UpdateTaskPriorityDto {
  @IsEnum(TaskPriority)
  priority!: TaskPriority;
}
