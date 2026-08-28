import { IsEnum } from 'class-validator';
import { TaskStatus } from 'src/generated/prisma/enums';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
