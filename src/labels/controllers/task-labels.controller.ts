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

@Controller('tasks/:taskId/labels')
export class TaskLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

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
