import { PrismaService } from 'src/database/prisma.service';
import { TaskPriority, TaskStatus } from 'src/generated/prisma/enums';

export async function createTask(
  prisma: PrismaService,
  boardId: string,
  createdById: string,
  overrides: Partial<{
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: Date;
    estimatedHours: number;
    assignedToId: string;
  }> = {},
) {
  return prisma.task.create({
    data: {
      boardId,
      createdById,
      title: overrides.title ?? `Test Task ${Date.now()}`,
      description: overrides.description ?? 'Task created for testing',
      priority: overrides.priority ?? 'MEDIUM',
      status: overrides.status ?? 'TODO',
      dueDate: overrides.dueDate,
      estimatedHours: overrides.estimatedHours,
      assignedToId: overrides.assignedToId,
    },
  });
}
