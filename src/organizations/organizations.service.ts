import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationRole } from 'src/generated/prisma/enums';

/* 
model Organization {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members  OrganizationMember[]
  projects Project[]
  labels   Label[]
}

model OrganizationMember {
  id             String           @id @default(uuid())
  userId         String
  organizationId String
  role           OrganizationRole
  joinedAt       DateTime         @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Un usuario no puede pertenecer dos veces a la misma organización
  @@unique([userId, organizationId])
  @@index([organizationId])
}
*/
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
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
