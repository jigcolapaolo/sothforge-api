import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BoardsService } from '../boards.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectGuard } from 'src/projects/guards/project.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CreateBoardDto } from '../dto/create-board.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller('projects/:projectId/boards')
export class ProjectBoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @ApiOperation({ summary: 'Create a board' })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid board data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard, ProjectGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  create(@Param('projectId') projectId: string, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(projectId, dto);
  }

  @ApiOperation({ summary: 'Get project boards' })
  @ApiResponse({ status: 200, description: 'Boards retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @UseGuards(JwtAuthGuard, ProjectGuard)
  findAll(@Param('projectId') projectId: string) {
    return this.boardsService.findAll(projectId);
  }
}
