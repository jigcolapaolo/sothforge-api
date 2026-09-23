import { PrismaService } from 'src/database/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.taskLabel.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.board.deleteMany(),
    prisma.project.deleteMany(),
    prisma.label.deleteMany(),
    prisma.organizationMember.deleteMany(),
    prisma.session.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);
}
