import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from 'src/audit/audit.service';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: {
    $transaction: jest.Mock;
    organizationMember: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      organizationMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization and assign the creator as OWNER', async () => {
      type TransactionClient = {
        organization: {
          create: jest.Mock;
        };
        organizationMember: {
          create: jest.Mock;
        };
      };

      const userId = 'user-1';

      const dto = {
        name: 'Test Organization',
        description: 'Test description',
      };

      const organization = {
        id: 'organization-1',
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx: TransactionClient = {
        organization: {
          create: jest.fn().mockResolvedValue(organization),
        },
        organizationMember: {
          create: jest.fn().mockResolvedValue({
            id: 'membership-1',
          }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (callback: (tx: TransactionClient) => Promise<unknown>) => {
          return callback(tx);
        },
      );

      const result = await service.create(userId, dto);

      expect(tx.organization.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
      expect(tx.organizationMember.create).toHaveBeenCalledWith({
        data: {
          userId,
          organizationId: organization.id,
          role: OrganizationRole.OWNER,
        },
      });
      expect(result).toEqual(organization);
    });
  });

  describe('findAllByUser', () => {
    it('should return the organizations where the user is a member', async () => {
      const userId = 'user-1';
      const joinedAt = new Date();

      const memberships = [
        {
          role: OrganizationRole.OWNER,
          joinedAt,
          organization: {
            id: 'organization-1',
            name: 'Organization 1',
            description: 'Description 1',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 3 },
          },
        },
      ];

      prisma.organizationMember.findMany.mockResolvedValue(memberships);

      const result = await service.findAllByUser(userId);

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: {
          role: true,
          joinedAt: true,
          organization: { include: { _count: { select: { members: true } } } },
        },
        orderBy: { joinedAt: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'organization-1',
          name: 'Organization 1',
          description: 'Description 1',
          createdAt: memberships[0].organization.createdAt,
          updatedAt: memberships[0].organization.updatedAt,
          memberCount: 3,
          role: OrganizationRole.OWNER,
          joinedAt,
        },
      ]);

      expect(result[0]).not.toHaveProperty('_count');
    });

    it('should return an empty array when the user has no organizations', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([]);
      const result = await service.findAllByUser('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return the organization with membership information', async () => {
      const organizationId = 'organization-1';
      const joinedAt = new Date();

      const membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId,
        role: OrganizationRole.ADMIN,
        joinedAt,
      };

      const organization = {
        id: organizationId,
        name: 'Test Organization',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          members: 5,
        },
      };

      prisma.organization.findUnique.mockResolvedValue(organization);

      const result = await service.findOne(organizationId, membership);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: {
          id: organizationId,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: organizationId,
        name: 'Test Organization',
        description: 'Test description',
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        memberCount: 5,
        role: OrganizationRole.ADMIN,
        joinedAt,
      });

      expect(result).not.toHaveProperty('_count');
    });

    it('should throw NotFoundException when the organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('organization-1', {
          id: 'membership-1',
          userId: 'user-1',
          organizationId: 'organization-1',
          role: OrganizationRole.MEMBER,
          joinedAt: new Date(),
        }),
      ).rejects.toThrow('Organization not found');

      expect(prisma.organization.findUnique).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        name: 'Updated Organization',
        description: 'Updated description',
      };

      const updatedOrganization = {
        id: organizationId,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateOrganization = jest
        .fn()
        .mockResolvedValue(updatedOrganization);

      const tx = {
        organization: {
          update: updateOrganization,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      const result = await service.update(userId, organizationId, dto);

      expect(updateOrganization).toHaveBeenCalledWith({
        where: {
          id: organizationId,
        },
        data: {
          ...dto,
        },
      });

      expect(result).toEqual(updatedOrganization);
    });
  });

  describe('remove', () => {
    it('should delete an organization', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';

      const deleteOrganization = jest.fn().mockResolvedValue({
        id: organizationId,
      });

      const tx = {
        organization: {
          delete: deleteOrganization,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      await service.remove(userId, organizationId);

      expect(deleteOrganization).toHaveBeenCalledWith({
        where: {
          id: organizationId,
        },
      });
    });
  });

  describe('createMember', () => {
    it('should create a new member with the VIEWER role', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        userId: 'user-2',
      };

      const membership = {
        id: 'membership-1',
        role: OrganizationRole.VIEWER,
        joinedAt: new Date(),
        user: {
          id: 'user-2',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        },
      };

      prisma.user.findUnique.mockResolvedValue({
        id: dto.userId,
      });

      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const createMembership = jest.fn().mockResolvedValue(membership);

      const tx = {
        organizationMember: {
          create: createMembership,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      const result = await service.createMember(userId, organizationId, dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: dto.userId,
        },
        select: {
          id: true,
        },
      });

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: dto.userId,
            organizationId,
          },
        },
      });

      expect(createMembership).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          organizationId,
          role: OrganizationRole.VIEWER,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      expect(result).toEqual(membership);
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      const dto = {
        userId: 'user-2',
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createMember('user-1', 'organization-1', dto),
      ).rejects.toThrow('User not found');

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();

      expect(prisma.organizationMember.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the user already belongs to the organization', async () => {
      const organizationId = 'organization-1';

      const dto = {
        userId: 'user-2',
      };

      prisma.user.findUnique.mockResolvedValue({
        id: dto.userId,
      });

      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: dto.userId,
        organizationId,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date(),
      });

      await expect(
        service.createMember('user-1', organizationId, dto),
      ).rejects.toThrow('User already belongs to this organization.');

      expect(prisma.organizationMember.create).not.toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('should return all members of an organization', async () => {
      const organizationId = 'organization-1';

      const members = [
        {
          id: 'membership-1',
          role: OrganizationRole.OWNER,
          joinedAt: new Date('2026-01-01'),
          user: {
            id: 'user-1',
            username: 'owner',
            email: 'owner@example.com',
            avatar: null,
          },
        },
        {
          id: 'membership-2',
          role: OrganizationRole.MEMBER,
          joinedAt: new Date('2026-01-02'),
          user: {
            id: 'user-2',
            username: 'member',
            email: 'member@example.com',
            avatar: null,
          },
        },
      ];

      prisma.organizationMember.findMany.mockResolvedValue(members);

      const result = await service.getMembers(organizationId);

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      expect(result).toEqual(members);
    });
  });

  describe('updateMemberRole', () => {
    it('should update the role of a member', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';
      const memberUserId = 'user-2';

      const dto = {
        role: OrganizationRole.ADMIN,
      };

      const previousMembership = {
        id: 'membership-1',
        userId: memberUserId,
        organizationId,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date(),
      };

      const updatedMembership = {
        id: 'membership-1',
        role: OrganizationRole.ADMIN,
        joinedAt: previousMembership.joinedAt,
        user: {
          id: memberUserId,
          username: 'member',
          email: 'member@example.com',
          avatar: null,
        },
      };

      prisma.organizationMember.findUnique.mockResolvedValue(
        previousMembership,
      );

      const updateMembership = jest.fn().mockResolvedValue(updatedMembership);

      const tx = {
        organizationMember: {
          update: updateMembership,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      const result = await service.updateMemberRole(
        userId,
        organizationId,
        memberUserId,
        dto,
      );

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId,
          },
        },
      });

      expect(updateMembership).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId,
          },
        },
        data: {
          role: OrganizationRole.ADMIN,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      expect(result).toEqual(updatedMembership);
    });

    it('should throw BadRequestException when trying to assign the OWNER role', async () => {
      const dto = {
        role: OrganizationRole.OWNER,
      };

      await expect(
        service.updateMemberRole('user-1', 'organization-1', 'user-2', dto),
      ).rejects.toThrow(
        'OWNER role can only be assigned through ownership transfer',
      );

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.organizationMember.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the member does not belong to the organization', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);

      const dto = {
        role: OrganizationRole.MEMBER,
      };

      await expect(
        service.updateMemberRole('user-1', 'organization-1', 'user-2', dto),
      ).rejects.toThrow('User does not belong to this organization');

      expect(prisma.organizationMember.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to change the OWNER role', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'organization-1',
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      const dto = {
        role: OrganizationRole.ADMIN,
      };

      await expect(
        service.updateMemberRole('user-1', 'organization-1', 'user-1', dto),
      ).rejects.toThrow(
        'Owner role can only be changed through ownership transfer',
      );

      expect(prisma.organizationMember.update).not.toHaveBeenCalled();
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to another member', async () => {
      const currentOwnerId = 'user-1';
      const organizationId = 'organization-1';
      const newOwnerId = 'user-2';

      const newOwnerMembership = {
        id: 'membership-2',
        userId: newOwnerId,
        organizationId,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date(),
      };

      prisma.organizationMember.findUnique.mockResolvedValue(
        newOwnerMembership,
      );

      const firstUpdate = jest.fn().mockResolvedValue({});
      const secondUpdate = jest.fn().mockResolvedValue({});

      const updateMembership = jest
        .fn()
        .mockImplementationOnce(firstUpdate)
        .mockImplementationOnce(secondUpdate);

      const tx = {
        organizationMember: {
          update: updateMembership,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      await service.transferOwnership(
        currentOwnerId,
        organizationId,
        newOwnerId,
      );

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: newOwnerId,
            organizationId,
          },
        },
      });

      expect(updateMembership).toHaveBeenNthCalledWith(1, {
        where: {
          userId_organizationId: {
            userId: currentOwnerId,
            organizationId,
          },
        },
        data: {
          role: OrganizationRole.ADMIN,
        },
      });

      expect(updateMembership).toHaveBeenNthCalledWith(2, {
        where: {
          userId_organizationId: {
            userId: newOwnerId,
            organizationId,
          },
        },
        data: {
          role: OrganizationRole.OWNER,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when the new owner is the current owner', async () => {
      const userId = 'user-1';

      await expect(
        service.transferOwnership(userId, 'organization-1', userId),
      ).rejects.toThrow('The new owner must be a different user');

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the new owner is not a member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.transferOwnership('user-1', 'organization-1', 'user-2'),
      ).rejects.toThrow('User does not belong to this organization');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the organization', async () => {
      const organizationId = 'organization-1';
      const memberUserId = 'user-2';
      const currentUserId = 'user-1';

      const membership = {
        id: 'membership-1',
        userId: memberUserId,
        organizationId,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date(),
      };

      prisma.organizationMember.findUnique.mockResolvedValue(membership);

      const deleteMembership = jest.fn().mockResolvedValue(membership);

      const tx = {
        organizationMember: {
          delete: deleteMembership,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      await service.removeMember(organizationId, memberUserId, currentUserId);

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId,
          },
        },
      });

      expect(deleteMembership).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId,
          },
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when trying to remove yourself', async () => {
      const userId = 'user-1';

      await expect(
        service.removeMember('organization-1', userId, userId),
      ).rejects.toThrow('You cannot remove yourself using this endpoint');

      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
      expect(prisma.organizationMember.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the member does not belong to the organization', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('organization-1', 'user-2', 'user-1'),
      ).rejects.toThrow('User does not belong to this organization');

      expect(prisma.organizationMember.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to remove the owner', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        organizationId: 'organization-1',
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      await expect(
        service.removeMember('organization-1', 'user-2', 'user-1'),
      ).rejects.toThrow('Owner cannot be removed from the organization');

      expect(prisma.organizationMember.delete).not.toHaveBeenCalled();
    });
  });

  describe('leaveOrganization', () => {
    it('should allow a non-owner member to leave the organization', async () => {
      const organizationId = 'organization-1';

      const membership = {
        id: 'membership-1',
        userId: 'user-2',
        organizationId,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date(),
      };

      const deleteMembership = jest.fn().mockResolvedValue(membership);

      const tx = {
        organizationMember: {
          delete: deleteMembership,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      await service.leaveOrganization(organizationId, membership);

      expect(deleteMembership).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: membership.userId,
            organizationId,
          },
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when the owner tries to leave the organization', async () => {
      const organizationId = 'organization-1';

      const membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      };

      await expect(
        service.leaveOrganization(organizationId, membership),
      ).rejects.toThrow(
        'Owner must transfer ownership before leaving the organization',
      );

      expect(prisma.organizationMember.delete).not.toHaveBeenCalled();
    });
  });
});
