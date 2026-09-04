import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommentsService } from '../comments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TaskGuard } from 'src/tasks/guards/task.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({
    summary: 'Create a comment',
    description: 'Creates a comment on a task.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'ID of the task',
    type: String,
  })
  @ApiBody({
    type: CreateCommentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully.',
  })
  @ApiResponse({
    status: 403,
    description:
      'User does not have permission to create comments on this task.',
  })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
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

  @ApiOperation({
    summary: 'List task comments',
    description: 'Returns all comments belonging to a task.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'ID of the task',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this task.',
  })
  @Get()
  @UseGuards(JwtAuthGuard, TaskGuard)
  findAll(@Param('taskId') taskId: string) {
    return this.commentsService.findAll(taskId);
  }
}
