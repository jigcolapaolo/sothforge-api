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
  UseGuards,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from 'src/auth/guards/organization.guard';
import { ProjectGuard } from 'src/projects/guards/project.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller('organizations/:organizationId/projects/:projectId/boards')
export class BoardsController {
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
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard)
  findAll(@Param('projectId') projectId: string) {
    return this.boardsService.findAll(projectId);
  }

  @ApiOperation({ summary: 'Get a board' })
  @ApiResponse({ status: 200, description: 'Board retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @Get(':boardId')
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard)
  findOne(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.findOne(projectId, boardId);
  }

  @ApiOperation({ summary: 'Update a board' })
  @ApiResponse({ status: 200, description: 'Board updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid board data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':boardId')
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  update(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(projectId, boardId, dto);
  }

  @ApiOperation({ summary: 'Delete a board' })
  @ApiResponse({ status: 204, description: 'Board deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  remove(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.remove(projectId, boardId);
  }
}
