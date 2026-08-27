import { Controller } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller(
  'organizations/:organizationId/projects/:projectId/boards/:boardId/tasks',
)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
}
