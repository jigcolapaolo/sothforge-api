import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@Injectable()
export class CommentGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const commentId = request.params.taskId;

    if (!userId || typeof commentId !== 'string') {
      throw new ForbiddenException('Comment access denied');
    }

    const commentContext = await this.authorizationService.getCommentContext(
      userId,
      commentId,
    );

    if (!commentContext) {
      throw new ForbiddenException('Comment access denied');
    }

    request.organizationMembership = commentContext.membership;
    request.resourceOrganizationId = commentContext.resourceOrganizationId;

    return true;
  }
}
