import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CommentsService } from '../comments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CommentGuard } from '../guards/comment.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':commentId')
  @UseGuards(JwtAuthGuard, CommentGuard)
  findOne(@Param('commentId') commentId: string) {
    return this.commentsService.findOne(commentId);
  }
}
