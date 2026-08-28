import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from 'src/auth/guards/organization.guard';
import { ProjectGuard } from 'src/projects/guards/project.guard';
import { BoardGuard } from 'src/boards/guards/board.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller(
  'organizations/:organizationId/projects/:projectId/boards/:boardId/tasks',
)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  create(
    @Param('boardId') boardId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(boardId, user.userId, dto);
  }
}
