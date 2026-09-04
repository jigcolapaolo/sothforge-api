import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { commentSelect } from './constants/comment.select';

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
    const comment = await this.prisma.comment.findFirst({
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
}
