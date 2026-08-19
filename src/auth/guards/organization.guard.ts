import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { OrganizationRequest } from '../types/organization-request';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();

    const userId = request.user?.userId;
    const organizationId = request.params.organizationId;

    if (!userId || !organizationId) {
      throw new ForbiddenException('Organization access denied');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    request.organizationMembership = membership;

    return true;
  }
}
