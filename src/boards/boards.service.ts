import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';

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
}
