import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const organizationId = request.params.organizationId;

    if (!userId || typeof organizationId !== 'string') {
      throw new ForbiddenException('Organization access denied');
    }

    const membership =
      await this.authorizationService.getOrganizationMembership(
        userId,
        organizationId,
      );

    if (!membership) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    request.organizationMembership = membership;

    return true;
  }
}
