import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardGuard } from 'src/boards/guards/board.guard';
import { AuthorizationService } from 'src/common/authorization/authorization.service';

describe('BoardGuard', () => {
  let guard: BoardGuard;

  let authorizationService: {
    getBoardContext: jest.Mock;
  };

  let request: {
    user?: {
      userId: string;
    };
    params: {
      boardId?: string;
    };
    organizationMembership?: unknown;
    resourceOrganizationId?: string;
  };

  let context: {
    switchToHttp: jest.Mock;
  };

  beforeEach(async () => {
    authorizationService = {
      getBoardContext: jest.fn(),
    };

    request = {
      user: {
        userId: 'user-id',
      },
      params: {
        boardId: 'board-id',
      },
    };

    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    guard = module.get<BoardGuard>(BoardGuard);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when the board context exists', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      authorizationService.getBoardContext.mockResolvedValue({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      const result = await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(result).toBe(true);

      expect(authorizationService.getBoardContext).toHaveBeenCalledWith(
        'user-id',
        'board-id',
      );

      expect(request.organizationMembership).toEqual(membership);

      expect(request.resourceOrganizationId).toBe('organization-id');
    });

    it('should deny access when the user is missing', async () => {
      request.user = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Board access denied');

      expect(authorizationService.getBoardContext).not.toHaveBeenCalled();
    });

    it('should deny access when the board ID is invalid', async () => {
      request.params.boardId = undefined;

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Board access denied');

      expect(authorizationService.getBoardContext).not.toHaveBeenCalled();
    });

    it('should deny access when the board context does not exist', async () => {
      authorizationService.getBoardContext.mockResolvedValue(null);

      await expect(
        guard.canActivate(context as unknown as ExecutionContext),
      ).rejects.toThrow('Board access denied');

      expect(authorizationService.getBoardContext).toHaveBeenCalledWith(
        'user-id',
        'board-id',
      );

      expect(request.organizationMembership).toBeUndefined();
      expect(request.resourceOrganizationId).toBeUndefined();
    });
  });
});
