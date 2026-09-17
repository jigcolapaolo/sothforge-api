import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from 'src/comments/comments.service';
import { PrismaService } from 'src/database/prisma.service';
import { OrganizationMember } from 'src/generated/prisma/client';
import { OrganizationRole } from 'src/generated/prisma/enums';

describe('CommentsService', () => {
  let service: CommentsService;

  let prisma: {
    comment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const taskId = 'task-1';
      const authorId = 'user-1';

      const dto = {
        content: 'We could do this task this way...',
      };

      const comment = {
        id: 'comment-1',
        taskId,
        authorId,
        content: dto.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.comment.create.mockResolvedValue(comment);

      const result = await service.create(taskId, authorId, dto);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          taskId,
          authorId,
          content: dto.content,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.any(Object),
      });

      expect(result).toEqual(comment);
    });
  });

  describe('findAll', () => {
    it('should return all comments for a task ordered by newest first', async () => {
      const taskId = 'task-1';

      const comments = [
        {
          id: 'comment-1',
          taskId,
          authorId: 'user-1',
          content: 'First comment',
        },
        {
          id: 'comment-2',
          taskId,
          authorId: 'user-2',
          content: 'Second comment',
        },
      ];

      prisma.comment.findMany.mockResolvedValue(comments);

      const result = await service.findAll(taskId);

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          taskId,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(comments);
    });
  });

  describe('findOne', () => {
    it('should return an existing comment', async () => {
      const commentId = 'comment-1';

      const comment = {
        id: commentId,
        taskId: 'task-1',
        authorId: 'user-1',
        content: 'This is a comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.comment.findUnique.mockResolvedValue(comment);

      const result = await service.findOne(commentId);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: commentId,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.any(Object),
      });

      expect(result).toEqual(comment);
    });

    it('should throw NotFoundException when the comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('comment-1')).rejects.toThrow(
        'Comment not found',
      );
    });
  });

  describe('update', () => {
    it('should update a comment when the current user is the author', async () => {
      const commentId = 'comment-1';
      const currentUserId = 'user-1';

      const comment = {
        authorId: currentUserId,
      };

      const dto = {
        content: 'Updated comment content',
      };

      const updatedComment = {
        id: commentId,
        authorId: currentUserId,
        content: dto.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.comment.findUnique.mockResolvedValue(comment);
      prisma.comment.update.mockResolvedValue(updatedComment);

      const result = await service.update(commentId, currentUserId, dto);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: commentId,
        },
        select: {
          authorId: true,
        },
      });

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: {
          id: commentId,
        },
        data: {
          content: dto.content,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.any(Object),
      });

      expect(result).toEqual(updatedComment);
    });

    it('should throw NotFoundException when the comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('comment-1', 'user-1', {
          content: 'Updated content',
        }),
      ).rejects.toThrow('Comment not found');

      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the current user is not the author', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        authorId: 'user-1',
      });

      await expect(
        service.update('comment-1', 'user-2', {
          content: 'Trying to edit someone else comment',
        }),
      ).rejects.toThrow('You can only edit your own comments');

      expect(prisma.comment.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove own comment when the current user is a MEMBER', async () => {
      const commentId = 'comment-1';

      const currentMembership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        role: OrganizationRole.MEMBER,
      } as OrganizationMember;

      const comment = {
        authorId: 'user-1',
        author: {
          memberships: [
            {
              role: OrganizationRole.MEMBER,
            },
          ],
        },
      };

      prisma.comment.findUnique.mockResolvedValue(comment);
      prisma.comment.delete.mockResolvedValue(undefined);

      const result = await service.remove(commentId, currentMembership);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: {
          id: commentId,
        },
        select: {
          authorId: true,
          author: {
            select: {
              memberships: {
                where: {
                  organizationId: currentMembership.organizationId,
                },
                select: {
                  role: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: {
          id: commentId,
        },
      });

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the comment does not exist', async () => {
      const currentMembership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        role: OrganizationRole.MEMBER,
      } as OrganizationMember;

      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('comment-1', currentMembership),
      ).rejects.toThrow('Comment not found');

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the comment author is not a member of the organization', async () => {
      const currentMembership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        role: OrganizationRole.ADMIN,
      } as OrganizationMember;

      const comment = {
        authorId: 'user-2',
        author: {
          memberships: [],
        },
      };

      prisma.comment.findUnique.mockResolvedValue(comment);

      await expect(
        service.remove('comment-1', currentMembership),
      ).rejects.toThrow('Comment authro is not a member of this organization');

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a MEMBER tries to delete another user comment', async () => {
      const currentMembership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        role: OrganizationRole.MEMBER,
      } as OrganizationMember;

      const comment = {
        authorId: 'user-2',
        author: {
          memberships: [
            {
              role: OrganizationRole.MEMBER,
            },
          ],
        },
      };

      prisma.comment.findUnique.mockResolvedValue(comment);

      await expect(
        service.remove('comment-1', currentMembership),
      ).rejects.toThrow('You can only delete your own comments as a MEMBER');

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when an ADMIN tries to delete an OWNER comment', async () => {
      const currentMembership = {
        id: 'membership-1',
        userId: 'admin-1',
        organizationId: 'organization-1',
        role: OrganizationRole.ADMIN,
      } as OrganizationMember;

      const comment = {
        authorId: 'owner-1',
        author: {
          memberships: [
            {
              role: OrganizationRole.OWNER,
            },
          ],
        },
      };

      prisma.comment.findUnique.mockResolvedValue(comment);

      await expect(
        service.remove('comment-1', currentMembership),
      ).rejects.toThrow(
        'Admins cannot delete comments from the organization owner',
      );

      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });
  });
});
