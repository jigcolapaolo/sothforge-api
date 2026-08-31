import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({
    description: 'ID of the user to assign to the task',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;
}
