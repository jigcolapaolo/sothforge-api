import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectsModule } from 'src/projects/projects.module';

@Module({
  imports: [PrismaModule, AuthModule, ProjectsModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
