import { PrismaService } from 'src/database/prisma.service';

import { createUser } from './user.factory';
import { createOrganization } from './organization.factory';
import { createProject } from './project.factory';
import { createBoard } from './board.factory';
import { createTask } from './task.factory';

export async function createProjectScenario(prisma: PrismaService) {
  const user = await createUser(prisma);

  const organization = await createOrganization(prisma, user.id);

  const project = await createProject(prisma, organization.id);

  const board = await createBoard(prisma, project.id);

  return {
    user,
    organization,
    project,
    board,
  };
}

export async function createTaskScenario(prisma: PrismaService) {
  const scenario = await createProjectScenario(prisma);

  const task = await createTask(prisma, scenario.board.id, scenario.user.id);

  return {
    ...scenario,
    task,
  };
}

export async function createTaskWithMemberScenario(prisma: PrismaService) {
  const owner = await createUser(prisma, {
    username: `owner-${Date.now()}`,
    email: `owner-${Date.now()}@example.com`,
  });

  const member = await createUser(prisma, {
    username: `member-${Date.now()}`,
    email: `member-${Date.now()}@example.com`,
  });

  const organization = await createOrganization(prisma, owner.id);

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: member.id,
      role: 'MEMBER',
    },
  });

  const project = await createProject(prisma, organization.id);

  const board = await createBoard(prisma, project.id);

  const task = await createTask(prisma, board.id, owner.id, {
    assignedToId: member.id,
  });

  return {
    owner,
    member,
    organization,
    project,
    board,
    task,
  };
}
