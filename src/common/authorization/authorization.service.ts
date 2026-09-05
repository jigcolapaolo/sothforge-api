import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ResourceAuthorizationContext } from './types/resource-autorization-context';

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

  async getProjectContext(
    userId: string,
    projectId: string,
  ): Promise<ResourceAuthorizationContext | null> {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        organizationId: true,
      },
    });

    if (!project) {
      return null;
    }

    const resourceOrganizationId = project.organizationId;

    const membership = await this.getOrganizationMembership(
      userId,
      resourceOrganizationId,
    );

    if (!membership) {
      return null;
    }

    return {
      membership,
      resourceOrganizationId,
    };
  }

  async getBoardContext(
    userId: string,
    boardId: string,
  ): Promise<ResourceAuthorizationContext | null> {
    const board = await this.prisma.board.findUnique({
      where: {
        id: boardId,
      },
      select: {
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!board) {
      return null;
    }

    const resourceOrganizationId = board.project.organizationId;

    const membership = await this.getOrganizationMembership(
      userId,
      resourceOrganizationId,
    );

    if (!membership) {
      return null;
    }

    return {
      membership,
      resourceOrganizationId,
    };
  }

  async getTaskContext(
    userId: string,
    taskId: string,
  ): Promise<ResourceAuthorizationContext | null> {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        board: {
          select: {
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
      return null;
    }

    const resourceOrganizationId = task.board.project.organizationId;

    const membership = await this.getOrganizationMembership(
      userId,
      resourceOrganizationId,
    );

    if (!membership) {
      return null;
    }

    return { membership, resourceOrganizationId };
  }

  async getCommentContext(
    userId: string,
    commentId: string,
  ): Promise<ResourceAuthorizationContext | null> {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        task: {
          select: {
            board: {
              select: {
                project: {
                  select: {
                    organizationId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return null;
    }

    const resourceOrganizationId = comment.task.board.project.organizationId;

    const membership = await this.getOrganizationMembership(
      userId,
      resourceOrganizationId,
    );

    if (!membership) {
      return null;
    }

    return {
      membership,
      resourceOrganizationId,
    };
  }

  async getLabelContext(
    userId: string,
    labelId: string,
  ): Promise<ResourceAuthorizationContext | null> {
    const label = await this.prisma.label.findUnique({
      where: {
        id: labelId,
      },
      select: {
        organizationId: true,
      },
    });

    if (!label) {
      return null;
    }

    const resourceOrganizationId = label.organizationId;

    const membership = await this.getOrganizationMembership(
      userId,
      resourceOrganizationId,
    );

    if (!membership) {
      return null;
    }

    return {
      membership,
      resourceOrganizationId,
    };
  }
}
