import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        projectId,
        ...dto,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.board.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(projectId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        projectId,
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  async update(projectId: string, boardId: string, dto: UpdateBoardDto) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        projectId,
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return this.prisma.board.update({
      where: {
        id: boardId,
      },
      data: {
        ...dto,
      },
    });
  }

  async remove(projectId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        projectId,
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.prisma.board.delete({
      where: {
        id: boardId,
      },
    });
  }
}
