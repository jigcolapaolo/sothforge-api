import { AuthenticatedRequest } from './authenticated-request';

export interface OrganizationRequest extends AuthenticatedRequest {
  params: {
    organizationId: string;
  };
}
