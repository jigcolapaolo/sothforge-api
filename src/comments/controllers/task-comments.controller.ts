import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CommentsService } from '../comments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TaskGuard } from 'src/tasks/guards/task.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  create(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, user.userId, dto);
  }
}
