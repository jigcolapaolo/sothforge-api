import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { BoardsModule } from 'src/boards/boards.module';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthModule, BoardsModule, AuthorizationModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
