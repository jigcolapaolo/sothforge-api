import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@Injectable()
export class LabelGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;
    const labelId = request.params.labelId;

    if (!userId || typeof labelId !== 'string') {
      throw new ForbiddenException('Label access denied');
    }

    const labelContext = await this.authorizationService.getLabelContext(
      userId,
      labelId,
    );

    if (!labelContext) {
      throw new ForbiddenException('Label access denied');
    }

    request.organizationMembership = labelContext.membership;
    request.resourceOrganizationId = labelContext.resourceOrganizationId;

    return true;
  }
}
