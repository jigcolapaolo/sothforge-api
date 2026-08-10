/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// ==========================================
// IDS FIJOS PARA HACER EL SEED IDEMPOTENTE
// ==========================================

const ids = {
  organization: '00000000-0000-0000-0000-000000000001',

  users: {
    owner: '00000000-0000-0000-0001-000000000001',
    admin: '00000000-0000-0000-0001-000000000002',
    member: '00000000-0000-0000-0001-000000000003',
    viewer: '00000000-0000-0000-0001-000000000004',
  },

  memberships: {
    owner: '00000000-0000-0000-0010-000000000001',
    admin: '00000000-0000-0000-0010-000000000002',
    member: '00000000-0000-0000-0010-000000000003',
    viewer: '00000000-0000-0000-0010-000000000004',
  },

  projects: {
    api: '00000000-0000-0000-0020-000000000001',
    dashboard: '00000000-0000-0000-0020-000000000002',
  },

  boards: {
    backlog: '00000000-0000-0000-0030-000000000001',
    development: '00000000-0000-0000-0030-000000000002',
    review: '00000000-0000-0000-0030-000000000003',
    done: '00000000-0000-0000-0030-000000000004',
    dashboard: '00000000-0000-0000-0030-000000000005',
  },

  tasks: {
    auth: '00000000-0000-0000-0040-000000000001',
    prisma: '00000000-0000-0000-0040-000000000002',
    redis: '00000000-0000-0000-0040-000000000003',
    swagger: '00000000-0000-0000-0040-000000000004',
    dashboard: '00000000-0000-0000-0040-000000000005',
    archived: '00000000-0000-0000-0040-000000000006',
  },

  comments: {
    auth: '00000000-0000-0000-0050-000000000001',
    prisma: '00000000-0000-0000-0050-000000000002',
    redis: '00000000-0000-0000-0050-000000000003',
    dashboard: '00000000-0000-0000-0050-000000000004',
  },

  labels: {
    backend: '00000000-0000-0000-0060-000000000001',
    frontend: '00000000-0000-0000-0060-000000000002',
    bug: '00000000-0000-0000-0060-000000000003',
    feature: '00000000-0000-0000-0060-000000000004',
    documentation: '00000000-0000-0000-0060-000000000005',
  },
};

// ==========================================
// SEED
// ==========================================

async function main() {
  console.log('🌱 Starting database seed...');

  // ========================================
  // PASSWORDS
  // ========================================

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ========================================
  // ORGANIZATION
  // ========================================

  const organization = await prisma.organization.upsert({
    where: {
      id: ids.organization,
    },
    update: {
      name: 'SothForge Demo Organization',
      description: 'Organization created by the development seed.',
    },
    create: {
      id: ids.organization,
      name: 'SothForge Demo Organization',
      description: 'Organization created by the development seed.',
    },
  });

  // ========================================
  // USERS
  // ========================================

  const owner = await prisma.user.upsert({
    where: { id: ids.users.owner },
    update: {},
    create: {
      id: ids.users.owner,
      username: 'sothforge_owner',
      email: 'owner@sothforge.local',
      passwordHash,
      lastLogin: new Date(),
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: ids.users.admin },
    update: {},
    create: {
      id: ids.users.admin,
      username: 'sothforge_admin',
      email: 'admin@sothforge.local',
      passwordHash,
    },
  });

  const member = await prisma.user.upsert({
    where: { id: ids.users.member },
    update: {},
    create: {
      id: ids.users.member,
      username: 'sothforge_member',
      email: 'member@sothforge.local',
      passwordHash,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { id: ids.users.viewer },
    update: {},
    create: {
      id: ids.users.viewer,
      username: 'sothforge_viewer',
      email: 'viewer@sothforge.local',
      passwordHash,
    },
  });

  // ========================================
  // ORGANIZATION MEMBERS
  // ========================================

  await prisma.organizationMember.upsert({
    where: { id: ids.memberships.owner },
    update: {
      role: 'OWNER',
    },
    create: {
      id: ids.memberships.owner,
      userId: owner.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  await prisma.organizationMember.upsert({
    where: { id: ids.memberships.admin },
    update: {
      role: 'ADMIN',
    },
    create: {
      id: ids.memberships.admin,
      userId: admin.id,
      organizationId: organization.id,
      role: 'ADMIN',
    },
  });

  await prisma.organizationMember.upsert({
    where: { id: ids.memberships.member },
    update: {
      role: 'MEMBER',
    },
    create: {
      id: ids.memberships.member,
      userId: member.id,
      organizationId: organization.id,
      role: 'MEMBER',
    },
  });

  await prisma.organizationMember.upsert({
    where: { id: ids.memberships.viewer },
    update: {
      role: 'VIEWER',
    },
    create: {
      id: ids.memberships.viewer,
      userId: viewer.id,
      organizationId: organization.id,
      role: 'VIEWER',
    },
  });

  // ========================================
  // PROJECTS
  // ========================================

  const apiProject = await prisma.project.upsert({
    where: {
      id: ids.projects.api,
    },
    update: {},
    create: {
      id: ids.projects.api,
      organizationId: organization.id,
      name: 'SothForge API',
      description: 'Backend API for the SothForge project management platform.',
      status: 'IN_PROGRESS',
      startDate: new Date('2026-08-01'),
    },
  });

  const dashboardProject = await prisma.project.upsert({
    where: {
      id: ids.projects.dashboard,
    },
    update: {},
    create: {
      id: ids.projects.dashboard,
      organizationId: organization.id,
      name: 'SothForge Dashboard',
      description: 'Frontend dashboard for SothForge.',
      status: 'PLANNED',
    },
  });

  // ========================================
  // BOARDS
  // ========================================

  const backlogBoard = await prisma.board.upsert({
    where: { id: ids.boards.backlog },
    update: {},
    create: {
      id: ids.boards.backlog,
      projectId: apiProject.id,
      name: 'Backlog',
      description: 'Pending work and ideas.',
    },
  });

  const developmentBoard = await prisma.board.upsert({
    where: { id: ids.boards.development },
    update: {},
    create: {
      id: ids.boards.development,
      projectId: apiProject.id,
      name: 'Development',
      description: 'Tasks currently being developed.',
    },
  });

  const reviewBoard = await prisma.board.upsert({
    where: { id: ids.boards.review },
    update: {},
    create: {
      id: ids.boards.review,
      projectId: apiProject.id,
      name: 'Review',
      description: 'Tasks waiting for review.',
    },
  });

  const doneBoard = await prisma.board.upsert({
    where: { id: ids.boards.done },
    update: {},
    create: {
      id: ids.boards.done,
      projectId: apiProject.id,
      name: 'Done',
      description: 'Completed tasks.',
    },
  });

  const dashboardBoard = await prisma.board.upsert({
    where: { id: ids.boards.dashboard },
    update: {},
    create: {
      id: ids.boards.dashboard,
      projectId: dashboardProject.id,
      name: 'Dashboard Tasks',
      description: 'Frontend dashboard work.',
    },
  });

  // ========================================
  // LABELS
  // ========================================

  const backendLabel = await prisma.label.upsert({
    where: { id: ids.labels.backend },
    update: {},
    create: {
      id: ids.labels.backend,
      organizationId: organization.id,
      name: 'Backend',
      color: '#3B82F6',
    },
  });

  const frontendLabel = await prisma.label.upsert({
    where: { id: ids.labels.frontend },
    update: {},
    create: {
      id: ids.labels.frontend,
      organizationId: organization.id,
      name: 'Frontend',
      color: '#8B5CF6',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bugLabel = await prisma.label.upsert({
    where: { id: ids.labels.bug },
    update: {},
    create: {
      id: ids.labels.bug,
      organizationId: organization.id,
      name: 'Bug',
      color: '#EF4444',
    },
  });

  const featureLabel = await prisma.label.upsert({
    where: { id: ids.labels.feature },
    update: {},
    create: {
      id: ids.labels.feature,
      organizationId: organization.id,
      name: 'Feature',
      color: '#22C55E',
    },
  });

  const documentationLabel = await prisma.label.upsert({
    where: { id: ids.labels.documentation },
    update: {},
    create: {
      id: ids.labels.documentation,
      organizationId: organization.id,
      name: 'Documentation',
      color: '#F59E0B',
    },
  });

  // ========================================
  // TASKS
  // ========================================

  const authTask = await prisma.task.upsert({
    where: { id: ids.tasks.auth },
    update: {},
    create: {
      id: ids.tasks.auth,
      boardId: developmentBoard.id,
      title: 'Implement JWT authentication',
      description: 'Implement access and refresh token authentication.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      dueDate: new Date('2026-08-20'),
      estimatedHours: 12,
      createdById: owner.id,
      assignedToId: admin.id,
    },
  });

  const prismaTask = await prisma.task.upsert({
    where: { id: ids.tasks.prisma },
    update: {},
    create: {
      id: ids.tasks.prisma,
      boardId: doneBoard.id,
      title: 'Configure Prisma and PostgreSQL',
      description:
        'Configure Prisma ORM and connect the API to Neon PostgreSQL.',
      status: 'DONE',
      priority: 'HIGH',
      estimatedHours: 6,
      createdById: owner.id,
      assignedToId: member.id,
    },
  });

  const redisTask = await prisma.task.upsert({
    where: { id: ids.tasks.redis },
    update: {},
    create: {
      id: ids.tasks.redis,
      boardId: backlogBoard.id,
      title: 'Configure Redis caching',
      description:
        'Add Redis integration for caching and future infrastructure needs.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-08-25'),
      estimatedHours: 8,
      createdById: admin.id,
    },
  });

  const swaggerTask = await prisma.task.upsert({
    where: { id: ids.tasks.swagger },
    update: {},
    create: {
      id: ids.tasks.swagger,
      boardId: reviewBoard.id,
      title: 'Document REST API with Swagger',
      description: 'Document API endpoints and request/response schemas.',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      estimatedHours: 5,
      createdById: member.id,
      assignedToId: member.id,
    },
  });

  const dashboardTask = await prisma.task.upsert({
    where: { id: ids.tasks.dashboard },
    update: {},
    create: {
      id: ids.tasks.dashboard,
      boardId: dashboardBoard.id,
      title: 'Create project dashboard',
      description: 'Implement the main project management dashboard.',
      status: 'TODO',
      priority: 'MEDIUM',
      estimatedHours: 16,
      createdById: owner.id,
      assignedToId: member.id,
    },
  });

  const archivedTask = await prisma.task.upsert({
    where: { id: ids.tasks.archived },
    update: {},
    create: {
      id: ids.tasks.archived,
      boardId: doneBoard.id,
      title: 'Initial project setup',
      description: 'Initial project and repository setup.',
      status: 'ARCHIVED',
      priority: 'LOW',
      estimatedHours: 3,
      createdById: owner.id,
      assignedToId: admin.id,
    },
  });

  // ========================================
  // TASK LABELS
  // ========================================

  const taskLabels = [
    {
      taskId: authTask.id,
      labelId: backendLabel.id,
    },
    {
      taskId: authTask.id,
      labelId: featureLabel.id,
    },
    {
      taskId: prismaTask.id,
      labelId: backendLabel.id,
    },
    {
      taskId: prismaTask.id,
      labelId: documentationLabel.id,
    },
    {
      taskId: redisTask.id,
      labelId: backendLabel.id,
    },
    {
      taskId: redisTask.id,
      labelId: featureLabel.id,
    },
    {
      taskId: swaggerTask.id,
      labelId: documentationLabel.id,
    },
    {
      taskId: dashboardTask.id,
      labelId: frontendLabel.id,
    },
    {
      taskId: archivedTask.id,
      labelId: documentationLabel.id,
    },
  ];

  for (const taskLabel of taskLabels) {
    await prisma.taskLabel.upsert({
      where: {
        taskId_labelId: {
          taskId: taskLabel.taskId,
          labelId: taskLabel.labelId,
        },
      },
      update: {},
      create: taskLabel,
    });
  }

  // ========================================
  // COMMENTS
  // ========================================

  await prisma.comment.upsert({
    where: { id: ids.comments.auth },
    update: {},
    create: {
      id: ids.comments.auth,
      taskId: authTask.id,
      authorId: owner.id,
      content: 'Authentication flow should support access and refresh tokens.',
    },
  });

  await prisma.comment.upsert({
    where: { id: ids.comments.prisma },
    update: {},
    create: {
      id: ids.comments.prisma,
      taskId: prismaTask.id,
      authorId: member.id,
      content:
        'Prisma is connected successfully to the Neon PostgreSQL database.',
    },
  });

  await prisma.comment.upsert({
    where: { id: ids.comments.redis },
    update: {},
    create: {
      id: ids.comments.redis,
      taskId: redisTask.id,
      authorId: admin.id,
      content:
        'Redis integration should be tested locally before Docker integration.',
    },
  });

  await prisma.comment.upsert({
    where: { id: ids.comments.dashboard },
    update: {},
    create: {
      id: ids.comments.dashboard,
      taskId: dashboardTask.id,
      authorId: member.id,
      content: 'The dashboard should display projects, boards and task status.',
    },
  });

  console.log('✅ Seed completed successfully.');
}

// ==========================================
// EXECUTION
// ==========================================

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
