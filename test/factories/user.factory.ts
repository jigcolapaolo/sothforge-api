import { PrismaService } from 'src/database/prisma.service';

export async function createUser(
  prisma: PrismaService,
  overrides: Partial<{
    username: string;
    email: string;
    passwordHash: string;
  }> = {},
) {
  return prisma.user.create({
    data: {
      username: overrides.username ?? `test-user-${Date.now()}`,
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      passwordHash: overrides.passwordHash ?? 'test-password-hash',
    },
  });
}
