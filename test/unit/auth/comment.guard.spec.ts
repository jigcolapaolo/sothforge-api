import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentGuard } from 'src/comments/guards/comment.guard';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

describe('CommentGuard', () => {
  let guard: CommentGuard;

  let authorizationService: {
    getCommentContext: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      commentId?: string;
    };
    organizationMembership?: unknown;
    resourceOrganizationId?: string;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getCommentContext: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        commentId: 'comment-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<CommentGuard>(CommentGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the comment context exists', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getCommentContext.mockResolvedValue({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(authorizationService.getCommentContext).toHaveBeenCalledWith(
        'user-id',
        'comment-id',
      );

      expect(request.organizationMembership).toEqual(membership);

      expect(request.resourceOrganizationId).toBe('organization-id');
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Comment access denied');

      expect(authorizationService.getCommentContext).not.toHaveBeenCalled();
    });

    it('should deny access when the comment ID is invalid', async () => {
      request.params.commentId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Comment access denied');

      expect(authorizationService.getCommentContext).not.toHaveBeenCalled();
    });

    it('should deny access when the comment context does not exist', async () => {
      authorizationService.getCommentContext.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Comment access denied');

      expect(authorizationService.getCommentContext).toHaveBeenCalledWith(
        'user-id',
        'comment-id',
      );

      expect(request.organizationMembership).toBeUndefined();
      expect(request.resourceOrganizationId).toBeUndefined();
    });
  });
});
