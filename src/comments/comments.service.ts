import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { commentSelect } from './constants/comment.select';
import { UpdateCommentDto } from './dto/update-comment.dto';

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
}
