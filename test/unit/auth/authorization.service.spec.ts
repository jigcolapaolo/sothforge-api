import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { PrismaService } from 'src/database/prisma.service';

jest.mock('src/generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  let prisma: {
    organizationMember: {
      findUnique: jest.Mock;
    };
    project: {
      findUnique: jest.Mock;
    };
    board: {
      findUnique: jest.Mock;
    };
    task: {
      findUnique: jest.Mock;
    };
    comment: {
      findUnique: jest.Mock;
    };
    label: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      organizationMember: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      board: {
        findUnique: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
      },
      label: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);

    jest.clearAllMocks();
  });

  describe('getOrganizationMembership', () => {
    it('should return the organization membership', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getOrganizationMembership(
        'user-id',
        'organization-id',
      );

      expect(result).toEqual(membership);

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return null when the user is not a member of the organization', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getOrganizationMembership(
        'user-id',
        'organization-id',
      );

      expect(result).toBeNull();

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });

  describe('getProjectContext', () => {
    it('should return null when the project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      const result = await service.getProjectContext('user-id', 'project-id');

      expect(result).toBeNull();

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'project-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when the user is not a member of the project organization', async () => {
      prisma.project.findUnique.mockResolvedValue({
        organizationId: 'organization-id',
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getProjectContext('user-id', 'project-id');

      expect(result).toBeNull();

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'project-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return the resource authorization context', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.project.findUnique.mockResolvedValue({
        organizationId: 'organization-id',
      });

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getProjectContext('user-id', 'project-id');

      expect(result).toEqual({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'project-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });

  describe('getBoardContext', () => {
    it('should return null when the board does not exist', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      const result = await service.getBoardContext('user-id', 'board-id');

      expect(result).toBeNull();

      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'board-id',
        },
        select: {
          project: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when the user is not a member of the board organization', async () => {
      prisma.board.findUnique.mockResolvedValue({
        project: {
          organizationId: 'organization-id',
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getBoardContext('user-id', 'board-id');

      expect(result).toBeNull();

      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'board-id',
        },
        select: {
          project: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return the resource authorization context', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.board.findUnique.mockResolvedValue({
        project: {
          organizationId: 'organization-id',
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getBoardContext('user-id', 'board-id');

      expect(result).toEqual({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'board-id',
        },
        select: {
          project: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });

  describe('getTaskContext', () => {
    it('should return null when the task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      const result = await service.getTaskContext('user-id', 'task-id');

      expect(result).toBeNull();

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task-id',
        },
        select: {
          board: {
            select: {
              project: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when the user is not a member of the task organization', async () => {
      prisma.task.findUnique.mockResolvedValue({
        board: {
          project: {
            organizationId: 'organization-id',
          },
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getTaskContext('user-id', 'task-id');

      expect(result).toBeNull();

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task-id',
        },
        select: {
          board: {
            select: {
              project: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return the resource authorization context', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.task.findUnique.mockResolvedValue({
        board: {
          project: {
            organizationId: 'organization-id',
          },
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getTaskContext('user-id', 'task-id');

      expect(result).toEqual({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task-id',
        },
        select: {
          board: {
            select: {
              project: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });

  describe('getCommentContext', () => {
    it('should return null when the comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      const result = await service.getCommentContext('user-id', 'comment-id');

      expect(result).toBeNull();

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'comment-id',
        },
        select: {
          task: {
            select: {
              board: {
                select: {
                  project: {
                    select: {
                      organizationId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when the user is not a member of the comment organization', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        task: {
          board: {
            project: {
              organizationId: 'organization-id',
            },
          },
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getCommentContext('user-id', 'comment-id');

      expect(result).toBeNull();

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'comment-id',
        },
        select: {
          task: {
            select: {
              board: {
                select: {
                  project: {
                    select: {
                      organizationId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return the resource authorization context', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.comment.findUnique.mockResolvedValue({
        task: {
          board: {
            project: {
              organizationId: 'organization-id',
            },
          },
        },
      });

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getCommentContext('user-id', 'comment-id');

      expect(result).toEqual({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'comment-id',
        },
        select: {
          task: {
            select: {
              board: {
                select: {
                  project: {
                    select: {
                      organizationId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });

  describe('getLabelContext', () => {
    it('should return null when the label does not exist', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      const result = await service.getLabelContext('user-id', 'label-id');

      expect(result).toBeNull();

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'label-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when the user is not a member of the label organization', async () => {
      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-id',
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getLabelContext('user-id', 'label-id');

      expect(result).toBeNull();

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'label-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });

    it('should return the resource authorization context', async () => {
      const membership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'MEMBER',
      };

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-id',
      });

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const result = await service.getLabelContext('user-id', 'label-id');

      expect(result).toEqual({
        membership,
        resourceOrganizationId: 'organization-id',
      });

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'label-id',
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-id',
            organizationId: 'organization-id',
          },
        },
      });
    });
  });
});
