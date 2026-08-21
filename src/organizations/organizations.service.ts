import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

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
        organization: true,
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map(({ role, joinedAt, organization }) => ({
      ...organization,
      role,
      joinedAt,
    }));
  }

  async findOne(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        role: true,
        joinedAt: true,
        organization: true,
      },
    });

    if (!membership) {
      return null;
    }

    return {
      ...membership.organization,
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
}
