import { Controller } from '@nestjs/common';
import { CommentsService } from '../comments.service';

@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: CommentsService) {}
}
