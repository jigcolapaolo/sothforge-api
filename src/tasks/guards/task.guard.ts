import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@Injectable()
export class TaskGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const taskId = request.params.taskId;

    if (!userId || typeof taskId !== 'string') {
      throw new ForbiddenException('Task access denied');
    }

    const taskContext = await this.authorizationService.getTaskContext(
      userId,
      taskId,
    );

    if (!taskContext) {
      throw new ForbiddenException('Task access denied');
    }

    request.organizationMembership = taskContext.membership;
    request.resourceOrganizationId = taskContext.resourceOrganizationId;

    return true;
  }
}
