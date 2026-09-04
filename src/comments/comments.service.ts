import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { commentSelect } from './constants/comment.select';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  OrganizationMember,
  OrganizationRole,
} from 'src/generated/prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, authorId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        taskId,
        authorId,
        content: dto.content,
      },
      select: commentSelect,
    });
  }

  async findAll(taskId: string) {
    return this.prisma.comment.findMany({
      where: {
        taskId,
      },
      select: commentSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: commentSelect,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(
    commentId: string,
    currentUserId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        authorId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (currentUserId !== comment.authorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: dto.content,
      },
      select: commentSelect,
    });
  }

  async remove(commentId: string, currentMembership: OrganizationMember) {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        authorId: true,
        author: {
          select: {
            memberships: {
              where: {
                organizationId: currentMembership.organizationId,
              },
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const authorMembership = comment.author.memberships[0];

    if (!authorMembership) {
      throw new ForbiddenException(
        'Comment authro is not a member of this organization',
      );
    }

    if (
      currentMembership.role === OrganizationRole.MEMBER &&
      comment.authorId !== currentMembership.userId
    ) {
      throw new ForbiddenException(
        'You can only delete your own comments as a MEMBER',
      );
    }

    if (
      currentMembership.role === OrganizationRole.ADMIN &&
      authorMembership.role === OrganizationRole.OWNER
    ) {
      throw new ForbiddenException(
        'Admins cannot delete comments from the organization owner',
      );
    }

    await this.prisma.comment.delete({
      where: {
        id: commentId,
      },
    });
  }
}
