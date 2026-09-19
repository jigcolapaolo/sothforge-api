import { PrismaService } from 'src/database/prisma.service';

export async function createBoard(
  prisma: PrismaService,
  projectId: string,
  overrides: Partial<{
    name: string;
    description: string;
  }> = {},
) {
  return prisma.board.create({
    data: {
      projectId,
      name: overrides.name ?? `Test Board ${Date.now()}`,
      description: overrides.description ?? 'Board created for testing',
    },
  });
}
