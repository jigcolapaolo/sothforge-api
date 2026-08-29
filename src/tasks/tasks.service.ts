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

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(boardId: string, createdById: string, dto: CreateTaskDto) {
    const boardContext =
      await this.authorizationService.getBoardContext(boardId);

    if (!boardContext) {
      throw new NotFoundException('Board not found');
    }

    if (dto.assignedToId) {
      await this.validateAssignee(
        dto.assignedToId,
        boardContext.project.organizationId,
      );
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

  async findOne(boardId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        boardId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(boardId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        boardId,
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
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedHours: dto.estimatedHours,
      },
    });
  }

  async remove(boardId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        boardId,
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
