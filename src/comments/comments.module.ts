import { Module } from '@nestjs/common';
import { CommentsController } from './controllers/comments.controller';
import { CommentsService } from './comments.service';
import { CommentGuard } from './guards/comment.guard';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { TaskCommentsController } from './controllers/task-comments.controller';

@Module({
  imports: [PrismaModule, AuthModule, TasksModule, AuthorizationModule],
  controllers: [TaskCommentsController, CommentsController],
  providers: [CommentsService, CommentGuard],
})
export class CommentsModule {}
