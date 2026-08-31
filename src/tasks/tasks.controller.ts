import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskGuard } from './guards/task.guard';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskPriorityDto } from './dto/update-task-priority.dto';

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

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard, BoardGuard)
  findAll(@Param('boardId') boardId: string, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(boardId, query);
  }

  @Get(':taskId')
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
  )
  findOne(@Param('boardId') boardId: string, @Param('taskId') taskId: string) {
    return this.tasksService.findOne(boardId, taskId);
  }

  @Patch(':taskId')
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  update(
    @Param('boardId') boardId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(boardId, taskId, dto);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  remove(@Param('boardId') boardId: string, @Param('taskId') taskId: string) {
    return this.tasksService.remove(boardId, taskId);
  }

  @Patch(':taskId/assignee')
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  assignTask(@Param('taskId') taskId: string, @Body() dto: AssignTaskDto) {
    return this.tasksService.assignTask(taskId, dto);
  }

  @Delete(':taskId/assignee')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  removeAssignee(@Param('taskId') taskId: string) {
    return this.tasksService.removeAssignee(taskId);
  }

  @Patch(':taskId/status')
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  updateStatus(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(taskId, dto);
  }

  @Patch(':taskId/priority')
  @UseGuards(
    JwtAuthGuard,
    OrganizationGuard,
    ProjectGuard,
    BoardGuard,
    TaskGuard,
    RolesGuard,
  )
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  updatePriority(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskPriorityDto,
  ) {
    return this.tasksService.updatePriority(taskId, dto);
  }
}
