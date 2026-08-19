import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user';
import { OrganizationMember } from 'src/generated/prisma/client';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  organizationMembership?: OrganizationMember;
}
