import { Module } from '@nestjs/common';

import { BoardsService } from './boards.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { BoardGuard } from './guards/board.guard';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { ProjectBoardsController } from './controllers/project-boards.controller';
import { BoardsController } from './controllers/boards.controller';

@Module({
  imports: [PrismaModule, AuthModule, ProjectsModule, AuthorizationModule],
  controllers: [ProjectBoardsController, BoardsController],
  providers: [BoardsService, BoardGuard],
  exports: [BoardGuard],
})
export class BoardsModule {}
