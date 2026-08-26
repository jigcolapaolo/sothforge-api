import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from 'src/auth/guards/organization.guard';
import { ProjectGuard } from 'src/projects/guards/project.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CreateBoardDto } from './dto/create-board.dto';

@Controller('organizations/:organizationId/projects/:projectId/boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

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

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard)
  findAll(@Param('projectId') projectId: string) {
    return this.boardsService.findAll(projectId);
  }

  @Get(':boardId')
  @UseGuards(JwtAuthGuard, OrganizationGuard, ProjectGuard)
  findOne(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.boardsService.findOne(projectId, boardId);
  }
}
