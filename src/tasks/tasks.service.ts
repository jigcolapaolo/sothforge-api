import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

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
