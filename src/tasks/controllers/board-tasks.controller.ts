import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BoardGuard } from 'src/boards/guards/board.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('boards/:boardId/tasks')
export class BoardTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid task data' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard, BoardGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  create(
    @Param('boardId') boardId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(
      boardId,
      user.userId,
      request.resourceOrganizationId!,
      dto,
    );
  }

  @ApiOperation({ summary: 'List tasks from a board' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get()
  @UseGuards(JwtAuthGuard, BoardGuard)
  findAll(@Param('boardId') boardId: string, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(boardId, query);
  }
}
