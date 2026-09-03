import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

@Injectable()
export class BoardGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const boardId = request.params.boardId;

    if (!userId || typeof boardId !== 'string') {
      throw new ForbiddenException('Board access denied');
    }

    const boardContext = await this.authorizationService.getBoardContext(
      userId,
      boardId,
    );

    if (!boardContext) {
      throw new ForbiddenException('Board access denied');
    }

    request.organizationMembership = boardContext.membership;
    request.resourceOrganizationId = boardContext.resourceOrganizationId;

    return true;
  }
}
