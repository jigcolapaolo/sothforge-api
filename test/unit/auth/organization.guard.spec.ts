import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { OrganizationGuard } from 'src/organizations/guards/organization.guard';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;

  let authorizationService: {
    getOrganizationMembership: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      organizationId?: string;
    };
    organizationMembership?: unknown;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getOrganizationMembership: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        organizationId: 'organization-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the user belongs to the organization', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getOrganizationMembership.mockResolvedValue(
        membership,
      );

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(
        authorizationService.getOrganizationMembership,
      ).toHaveBeenCalledWith('user-id', 'organization-id');

      expect(request.organizationMembership).toEqual(membership);
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Organization access denied');

      expect(
        authorizationService.getOrganizationMembership,
      ).not.toHaveBeenCalled();
    });

    it('should deny access when the organization ID is invalid', async () => {
      request.params.organizationId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Organization access denied');

      expect(
        authorizationService.getOrganizationMembership,
      ).not.toHaveBeenCalled();
    });

    it('should deny access when the user does not belong to the organization', async () => {
      authorizationService.getOrganizationMembership.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('User does not belong to this organization');

      expect(
        authorizationService.getOrganizationMembership,
      ).toHaveBeenCalledWith('user-id', 'organization-id');

      expect(request.organizationMembership).toBeUndefined();
    });
  });
});
