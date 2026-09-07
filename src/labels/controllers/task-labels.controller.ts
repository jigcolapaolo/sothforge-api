import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LabelsService } from '../labels.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TaskGuard } from 'src/tasks/guards/task.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Labels')
@ApiBearerAuth()
@Controller('tasks/:taskId/labels')
export class TaskLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @ApiOperation({ summary: 'Assign a label to a task' })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
  })
  @ApiParam({
    name: 'labelId',
    description: 'Label ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Label assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Label does not belong to the task organization',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Label not found',
  })
  @ApiResponse({
    status: 409,
    description: 'The label is already assigned to this task',
  })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post(':labelId')
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  assign(
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.labelsService.assignToTask(
      taskId,
      labelId,
      request.resourceOrganizationId!,
    );
  }

  @ApiOperation({ summary: 'Remove a label from a task' })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
  })
  @ApiParam({
    name: 'labelId',
    description: 'Label ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Label removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'The label is not assigned to this task',
  })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, TaskGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  remove(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.labelsService.removeFromTask(taskId, labelId);
  }
}
