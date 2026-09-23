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
import { AuditService } from 'src/audit/audit.service';
import { AuditAction, AuditEntity } from 'src/audit/audit.constants';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
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

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
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

      await this.auditService.create(
        {
          userId: createdById,
          organizationId: resourceOrganizationId,
          action: AuditAction.TASK_CREATED,
          entity: AuditEntity.TASK,
          entityId: task.id,
        },
        tx,
      );

      return task;
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
        include: {
          labels: {
            select: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    const data = tasks.map(({ labels, ...task }) => ({
      ...task,
      labels: labels.map(({ label }) => label),
    }));

    return {
      data,
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
      include: {
        labels: {
          select: {
            label: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const { labels, ...taskData } = task;

    return {
      ...taskData,
      labels: labels.map(({ label }) => label),
    };
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      include: {
        board: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
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

      await this.auditService.create(
        {
          userId,
          organizationId: task.board.project.organizationId,
          action: AuditAction.TASK_UPDATED,
          entity: AuditEntity.TASK,
          entityId: taskId,
        },
        tx,
      );

      return updatedTask;
    });
  }

  async remove(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      include: {
        board: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.auditService.create(
        {
          userId,
          organizationId: task.board.project.organizationId,
          action: AuditAction.TASK_DELETED,
          entity: AuditEntity.TASK,
          entityId: taskId,
        },
        tx,
      );

      await tx.task.delete({
        where: {
          id: taskId,
        },
      });
    });
  }

  async assignTask(
    userId: string,
    taskId: string,
    resourceOrganizationId: string,
    dto: AssignTaskDto,
  ) {
    await this.validateAssignee(dto.userId, resourceOrganizationId);

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          assignedToId: dto.userId,
        },
      });

      await this.auditService.create(
        {
          userId,
          organizationId: resourceOrganizationId,
          action: AuditAction.TASK_ASSIGNED,
          entity: AuditEntity.TASK,
          entityId: taskId,
          metadata: {
            assignedToId: dto.userId,
          },
        },
        tx,
      );

      return task;
    });
  }

  async removeAssignee(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      include: {
        board: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          assignedToId: null,
        },
      });

      await this.auditService.create(
        {
          userId,
          organizationId: task.board.project.organizationId,
          action: AuditAction.TASK_UNASSIGNED,
          entity: AuditEntity.TASK,
          entityId: taskId,
        },
        tx,
      );
    });
  }

  async updateStatus(userId: string, taskId: string, dto: UpdateTaskStatusDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      include: {
        board: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          status: dto.status,
        },
      });

      if (task.status === dto.status) {
        return updatedTask;
      }

      await this.auditService.create(
        {
          userId,
          organizationId: task.board.project.organizationId,
          action: AuditAction.TASK_STATUS_CHANGED,
          entity: AuditEntity.TASK,
          entityId: taskId,
          metadata: {
            previousStatus: task.status,
            newStatus: dto.status,
          },
        },
        tx,
      );

      return updatedTask;
    });
  }

  async updatePriority(
    userId: string,
    taskId: string,
    dto: UpdateTaskPriorityDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      include: {
        board: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          priority: dto.priority,
        },
      });

      if (task.priority === dto.priority) {
        return updatedTask;
      }

      await this.auditService.create(
        {
          userId,
          organizationId: task.board.project.organizationId,
          action: AuditAction.TASK_PRIORITY_CHANGED,
          entity: AuditEntity.TASK,
          entityId: taskId,
          metadata: {
            previousPriority: task.priority,
            newPriority: dto.priority,
          },
        },
        tx,
      );

      return updatedTask;
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
