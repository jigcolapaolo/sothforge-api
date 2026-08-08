import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { BoardsModule } from './boards/boards.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { LabelsModule } from './labels/labels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DatabaseModule } from './database/prisma.module';

@Module({
  imports: [AuthModule, UsersModule, OrganizationsModule, ProjectsModule, BoardsModule, TasksModule, CommentsModule, LabelsModule, NotificationsModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
