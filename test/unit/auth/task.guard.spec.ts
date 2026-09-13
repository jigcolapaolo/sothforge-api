import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { TaskGuard } from 'src/tasks/guards/task.guard';

describe('TaskGuard', () => {
  let guard: TaskGuard;

  let authorizationService: {
    getTaskContext: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      taskId?: string;
    };
    organizationMembership?: unknown;
    resourceOrganizationId?: string;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getTaskContext: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        taskId: 'task-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<TaskGuard>(TaskGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the task context exists', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getTaskContext.mockResolvedValue({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(authorizationService.getTaskContext).toHaveBeenCalledWith(
        'user-id',
        'task-id',
      );

      expect(request.organizationMembership).toEqual(membership);

      expect(request.resourceOrganizationId).toBe('organization-id');
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Task access denied');

      expect(authorizationService.getTaskContext).not.toHaveBeenCalled();
    });

    it('should deny access when the task ID is invalid', async () => {
      request.params.taskId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Task access denied');

      expect(authorizationService.getTaskContext).not.toHaveBeenCalled();
    });

    it('should deny access when the task context does not exist', async () => {
      authorizationService.getTaskContext.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Task access denied');

      expect(authorizationService.getTaskContext).toHaveBeenCalledWith(
        'user-id',
        'task-id',
      );

      expect(request.organizationMembership).toBeUndefined();
      expect(request.resourceOrganizationId).toBeUndefined();
    });
  });
});
