import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { ProjectGuard } from 'src/projects/guards/project.guard';

describe('ProjectGuard', () => {
  let guard: ProjectGuard;

  let authorizationService: {
    getProjectContext: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      projectId?: string;
    };
    organizationMembership?: unknown;
    resourceOrganizationId?: string;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getProjectContext: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        projectId: 'project-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<ProjectGuard>(ProjectGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the project context exists', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getProjectContext.mockResolvedValue({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(authorizationService.getProjectContext).toHaveBeenCalledWith(
        'user-id',
        'project-id',
      );

      expect(request.organizationMembership).toEqual(membership);

      expect(request.resourceOrganizationId).toBe('organization-id');
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Project access denied');

      expect(authorizationService.getProjectContext).not.toHaveBeenCalled();
    });

    it('should deny access when the project ID is invalid', async () => {
      request.params.projectId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Project access denied');

      expect(authorizationService.getProjectContext).not.toHaveBeenCalled();
    });

    it('should deny access when the project context does not exist', async () => {
      authorizationService.getProjectContext.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Project access denied');

      expect(authorizationService.getProjectContext).toHaveBeenCalledWith(
        'user-id',
        'project-id',
      );

      expect(request.organizationMembership).toBeUndefined();
      expect(request.resourceOrganizationId).toBeUndefined();
    });
  });
});
