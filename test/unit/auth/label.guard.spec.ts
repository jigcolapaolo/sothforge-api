import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { LabelGuard } from 'src/labels/guards/label.guard';

describe('LabelGuard', () => {
  let guard: LabelGuard;

  let authorizationService: {
    getLabelContext: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      labelId?: string;
    };
    organizationMembership?: unknown;
    resourceOrganizationId?: string;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getLabelContext: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        labelId: 'label-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<LabelGuard>(LabelGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the label context exists', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getLabelContext.mockResolvedValue({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(authorizationService.getLabelContext).toHaveBeenCalledWith(
        'user-id',
        'label-id',
      );

      expect(request.organizationMembership).toEqual(membership);

      expect(request.resourceOrganizationId).toBe('organization-id');
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Label access denied');

      expect(authorizationService.getLabelContext).not.toHaveBeenCalled();
    });

    it('should deny access when the label ID is invalid', async () => {
      request.params.labelId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Label access denied');

      expect(authorizationService.getLabelContext).not.toHaveBeenCalled();
    });

    it('should deny access when the label context does not exist', async () => {
      authorizationService.getLabelContext.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Label access denied');

      expect(authorizationService.getLabelContext).toHaveBeenCalledWith(
        'user-id',
        'label-id',
      );

      expect(request.organizationMembership).toBeUndefined();
      expect(request.resourceOrganizationId).toBeUndefined();
    });
  });
});
