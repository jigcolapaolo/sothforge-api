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
import { CommentsService } from '../comments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CommentGuard } from '../guards/comment.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':commentId')
  @UseGuards(JwtAuthGuard, CommentGuard)
  findOne(@Param('commentId') commentId: string) {
    return this.commentsService.findOne(commentId);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':commentId')
  @UseGuards(JwtAuthGuard, CommentGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  update(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.userId, dto);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, CommentGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  remove(
    @Param('commentId') commentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.commentsService.remove(
      commentId,
      request.organizationMembership!,
    );
  }
}
