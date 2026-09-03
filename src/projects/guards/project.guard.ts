import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const projectId = request.params.projectId;

    if (!userId || typeof projectId !== 'string') {
      throw new ForbiddenException('Project access denied');
    }

    const projectContext = await this.authorizationService.getProjectContext(
      userId,
      projectId,
    );

    if (!projectContext) {
      throw new ForbiddenException('Project access denied');
    }

    request.organizationMembership = projectContext.membership;
    request.resourceOrganizationId = projectContext.resourceOrganizationId;

    return true;
  }
}
