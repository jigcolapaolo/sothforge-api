import { OrganizationMember } from 'src/generated/prisma/client';

export interface ResourceAuthorizationContext {
  membership: OrganizationMember;
  resourceOrganizationId: string;
}
