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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({
    summary: 'Get a comment',
    description: 'Returns a specific comment by its ID.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the comment',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this comment.',
  })
  @Get(':commentId')
  @UseGuards(JwtAuthGuard, CommentGuard)
  findOne(@Param('commentId') commentId: string) {
    return this.commentsService.findOne(commentId);
  }

  @ApiOperation({
    summary: 'Update a comment',
    description:
      'Updates the content of a comment. Only the comment author can edit it.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the comment',
    type: String,
  })
  @ApiBody({
    type: UpdateCommentDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to update this comment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
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

  @ApiOperation({
    summary: 'Delete a comment',
    description:
      'Deletes a comment according to the organization comment deletion rules.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the comment',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to delete this comment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
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
