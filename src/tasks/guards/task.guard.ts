import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TaskRequest } from '../types/task.request';

@Injectable()
export class TaskGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<TaskRequest>();

    const boardId = request.params.boardId;
    const taskId = request.params.taskId;

    if (!boardId || !taskId) {
      throw new ForbiddenException('Task access denied');
    }

    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
        boardId,
      },
    });

    if (!task) {
      throw new ForbiddenException('Task does not belong to this Board');
    }

    return true;
  }
}
