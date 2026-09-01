import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { TaskGuard } from '../guards/task.guard';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { UpdateTaskPriorityDto } from '../dto/update-task-priority.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Get(':taskId')
  @UseGuards(JwtAuthGuard, TaskGuard)
  findOne(@Param('boardId') boardId: string, @Param('taskId') taskId: string) {
    return this.tasksService.findOne(boardId, taskId);
  }

  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid task data' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':taskId')
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
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

  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  remove(@Param('boardId') boardId: string, @Param('taskId') taskId: string) {
    return this.tasksService.remove(boardId, taskId);
  }

  @ApiOperation({ summary: 'Assign a user to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'User assigned successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not belong to the organization',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':taskId/assignee')
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  assignTask(
    @Param('taskId') taskId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasksService.assignTask(
      taskId,
      request.resourceOrganizationId!,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove the assigned user from a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Assignee removed successfully' })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':taskId/assignee')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  removeAssignee(@Param('taskId') taskId: string) {
    return this.tasksService.removeAssignee(taskId);
  }

  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':taskId/status')
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
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

  @ApiOperation({ summary: 'Update task priority' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task priority updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid priority' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':taskId/priority')
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
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
