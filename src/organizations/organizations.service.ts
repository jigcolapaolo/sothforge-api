import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { OrganizationMember } from 'src/generated/prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role: OrganizationRole.OWNER,
        },
      });

      return organization;
    });
  }

  async findAllByUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
      },
      select: {
        role: true,
        joinedAt: true,
        organization: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map(({ role, joinedAt, organization }) => {
      const { _count, ...organizationData } = organization;

      return {
        ...organizationData,
        memberCount: _count.members,
        role,
        joinedAt,
      };
    });
  }

  async findOne(organizationId: string, membership: OrganizationMember) {
    const organization = await this.prisma.organization.findUnique({
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

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const { _count, ...organizationData } = organization;

    return {
      ...organizationData,
      memberCount: _count.members,
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        ...dto,
      },
    });
  }

  async remove(organizationId: string) {
    await this.prisma.organization.delete({
      where: {
        id: organizationId,
      },
    });
  }

  async createMember(organizationId: string, dto: CreateMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: dto.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.userId,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User already belongs to this organization.');
    }

    return this.prisma.organizationMember.create({
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
  }

  async getMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
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
  }

  async updateMemberRole(
    organizationId: string,
    memberUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    if (dto.role === OrganizationRole.OWNER) {
      throw new BadRequestException(
        'OWNER role can only be assigned through ownership transfer',
      );
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User does not belong to this organization');
    }

    if (membership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Owner role can only be changed through ownership transfer',
      );
    }

    return this.prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
      data: {
        role: dto.role,
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
  }

  async transferOwnership(
    currentOwnerId: string,
    organizationId: string,
    newOwnerId: string,
  ) {
    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException('The new owner must be a different user');
    }

    const newOwner = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: newOwnerId,
          organizationId,
        },
      },
    });

    if (!newOwner) {
      throw new NotFoundException('User does not belong to this organization');
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: currentOwnerId,
            organizationId,
          },
        },
        data: {
          role: OrganizationRole.ADMIN,
        },
      }),

      this.prisma.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: newOwnerId,
            organizationId,
          },
        },
        data: {
          role: OrganizationRole.OWNER,
        },
      }),
    ]);
  }

  async removeMember(
    organizationId: string,
    memberUserId: string,
    currentUserId: string,
  ) {
    if (memberUserId === currentUserId) {
      throw new ForbiddenException(
        'You cannot remove yourself using this endpoint',
      );
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User does not belong to this organization');
    }

    if (membership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Owner cannot be removed from the organization',
      );
    }

    await this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });
  }

  async leaveOrganization(
    organizationId: string,
    membership: OrganizationMember,
  ) {
    if (membership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Owner must transfer ownership before leaving the organization',
      );
    }

    await this.prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId: membership.userId,
          organizationId,
        },
      },
    });
  }
}
