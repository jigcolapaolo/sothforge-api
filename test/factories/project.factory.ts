import { PrismaService } from 'src/database/prisma.service';

export async function createProject(
  prisma: PrismaService,
  organizationId: string,
  overrides: Partial<{
    name: string;
    description: string;
  }> = {},
) {
  return prisma.project.create({
    data: {
      organizationId,
      name: overrides.name ?? `Test Project ${Date.now()}`,
      description: overrides.description ?? 'Project created for testing',
    },
  });
}
