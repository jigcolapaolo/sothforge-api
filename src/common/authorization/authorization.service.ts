import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationMembership(userId: string, organizationId: string) {
    return this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }

  async getProjectContext(projectId: string) {
    return this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });
  }

  async getBoardContext(boardId: string) {
    return this.prisma.board.findUnique({
      where: {
        id: boardId,
      },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });
  }

  async getTaskContext(taskId: string) {
    return this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        boardId: true,
        board: {
          select: {
            projectId: true,
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });
  }
}
