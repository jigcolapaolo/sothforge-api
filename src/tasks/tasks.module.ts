import { Module } from '@nestjs/common';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { BoardsModule } from 'src/boards/boards.module';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { TaskGuard } from './guards/task.guard';
import { BoardTasksController } from './controllers/board-tasks.controller';

@Module({
  imports: [PrismaModule, AuthModule, BoardsModule, AuthorizationModule],
  controllers: [BoardTasksController, TasksController],
  providers: [TasksService, TaskGuard],
})
export class TasksModule {}
