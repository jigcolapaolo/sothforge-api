import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { BoardRequest } from '../types/board.request';

@Injectable()
export class BoardGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<BoardRequest>();

    const projectId = request.params.projectId;
    const boardId = request.params.boardId;

    if (!projectId || !boardId) {
      throw new ForbiddenException('Board access denied');
    }

    const board = await this.prisma.board.findUnique({
      where: {
        id: boardId,
        projectId,
      },
    });

    if (!board) {
      throw new ForbiddenException('Board does not belong to this project');
    }

    return true;
  }
}
