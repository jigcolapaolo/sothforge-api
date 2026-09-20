import { PrismaService } from 'src/database/prisma.service';

export async function createOrganization(
  prisma: PrismaService,
  userId: string,
  overrides: Partial<{
    name: string;
    description: string;
  }> = {},
) {
  return prisma.organization.create({
    data: {
      name: overrides.name ?? `Test Organization ${Date.now()}`,
      description: overrides.description ?? 'Organization created for testing',
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
  });
}
