import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { TaskQueryDto } from './dto/task-query.dto';
import { Prisma } from 'src/generated/prisma/client';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskPriorityDto } from './dto/update-task-priority.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(
    boardId: string,
    createdById: string,
    resourceOrganizationId: string,
    dto: CreateTaskDto,
  ) {
    if (dto.assignedToId) {
      await this.validateAssignee(dto.assignedToId, resourceOrganizationId);
    }

    return this.prisma.task.create({
      data: {
        boardId,
        createdById,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedHours: dto.estimatedHours,
        assignedToId: dto.assignedToId,
      },
    });
  }

  async findAll(boardId: string, query: TaskQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      assignedToId,
      labelId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      boardId,

      ...(status && {
        status,
      }),

      ...(priority && {
        priority,
      }),

      ...(assignedToId && {
        assignedToId,
      }),

      ...(labelId && {
        labels: {
          some: {
            labelId,
          },
        },
      }),

      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const orderBy = {
      [sortBy]: sortOrder,
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
        estimatedHours: dto.estimatedHours,
      },
    });
  }

  async remove(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  }

  async assignTask(
    taskId: string,
    resourceOrganizationId: string,
    dto: AssignTaskDto,
  ) {
    await this.validateAssignee(dto.userId, resourceOrganizationId);

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        assignedToId: dto.userId,
      },
    });
  }

  async removeAssignee(taskId: string) {
    await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        assignedToId: null,
      },
    });
  }

  async updateStatus(taskId: string, dto: UpdateTaskStatusDto) {
    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: dto.status,
      },
    });
  }

  async updatePriority(taskId: string, dto: UpdateTaskPriorityDto) {
    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        priority: dto.priority,
      },
    });
  }

  private async validateAssignee(assignedToId: string, organizationId: string) {
    const membership =
      await this.authorizationService.getOrganizationMembership(
        assignedToId,
        organizationId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'Assigned user does not belong to this organization',
      );
    }
  }
}
