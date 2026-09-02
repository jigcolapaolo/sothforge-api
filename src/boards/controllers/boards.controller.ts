import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BoardsService } from '../boards.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BoardGuard } from '../guards/board.guard';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @ApiOperation({ summary: 'Get a board' })
  @ApiResponse({ status: 200, description: 'Board retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @Get(':boardId')
  @UseGuards(JwtAuthGuard, BoardGuard)
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
  @UseGuards(JwtAuthGuard, BoardGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, BoardGuard, RolesGuard)
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
