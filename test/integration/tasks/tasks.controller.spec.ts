import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import * as bcrypt from 'bcrypt';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';

import { cleanDatabase } from '../cleanup';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type TaskResponse = {
  id: string;
  boardId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedHours: number | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
};

type TaskListResponse = {
  data: TaskResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

describe('TasksController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = moduleRef.get(PrismaService);
    redis = moduleRef.get(RedisService);

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.getClient().flushDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should allow a member to create a task', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-member',
        email: 'task-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Organization',
        description: 'Task creation integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Project',
        description: 'Project for task integration tests',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Development Board',
        description: 'Board for task integration tests',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .post(`/boards/${board.id}/tasks`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        title: 'Implement task integration tests',
        description: 'Create the first Tasks integration test',
        priority: 'HIGH',
        estimatedHours: 4,
      })
      .expect(201);

    const body = response.body as TaskResponse;

    expect(body.boardId).toBe(board.id);
    expect(body.createdById).toBe(user.id);
    expect(body.title).toBe('Implement task integration tests');
    expect(body.description).toBe('Create the first Tasks integration test');
    expect(body.priority).toBe('HIGH');
    expect(body.assignedToId).toBeNull();

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask?.boardId).toBe(board.id);
    expect(persistedTask?.createdById).toBe(user.id);
    expect(persistedTask?.title).toBe('Implement task integration tests');
  });

  it('should allow a member to create a task assigned to another organization member', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const creator = await prisma.user.create({
      data: {
        username: 'task-creator',
        email: 'task-creator@example.com',
        passwordHash,
      },
    });

    const assignee = await prisma.user.create({
      data: {
        username: 'task-assignee',
        email: 'task-assignee@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Assignment Organization',
        description: 'Task assignment integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: creator.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
        {
          userId: assignee.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Assignment Project',
        description: 'Project for task assignment tests',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Development Board',
        description: 'Board for task assignment tests',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: creator.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .post(`/boards/${board.id}/tasks`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        title: 'Task assigned to another member',
        description: 'The assignee belongs to the same organization',
        priority: 'MEDIUM',
        assignedToId: assignee.id,
      })
      .expect(201);

    const body = response.body as TaskResponse;

    expect(body.boardId).toBe(board.id);
    expect(body.createdById).toBe(creator.id);
    expect(body.assignedToId).toBe(assignee.id);

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask?.createdById).toBe(creator.id);
    expect(persistedTask?.assignedToId).toBe(assignee.id);
  });

  it('should reject creating a task assigned to a user from another organization', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const creator = await prisma.user.create({
      data: {
        username: 'task-creator',
        email: 'task-creator@example.com',
        passwordHash,
      },
    });

    const externalUser = await prisma.user.create({
      data: {
        username: 'external-user',
        email: 'external-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Organization',
        description: 'Task assignment authorization test',
      },
    });

    const externalOrganization = await prisma.organization.create({
      data: {
        name: 'External Organization',
        description: 'Organization outside the task organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: creator.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: externalUser.id,
        organizationId: externalOrganization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Project',
        description: 'Project for assignment authorization',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Development Board',
        description: 'Board for assignment authorization',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: creator.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .post(`/boards/${board.id}/tasks`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        title: 'Invalidly assigned task',
        description: 'This task should not be created',
        priority: 'HIGH',
        assignedToId: externalUser.id,
      })
      .expect(403);

    const tasks = await prisma.task.findMany({
      where: {
        boardId: board.id,
      },
    });

    expect(tasks).toHaveLength(0);
  });

  it('should return the tasks of a board with pagination metadata', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-list-user',
        email: 'task-list-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task List Organization',
        description: 'Task listing integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task List Project',
        description: 'Project for task listing',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Development Board',
        description: 'Board for task listing',
      },
    });

    await prisma.task.createMany({
      data: [
        {
          boardId: board.id,
          createdById: user.id,
          title: 'First task',
          description: 'First task description',
          priority: 'LOW',
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Second task',
          description: 'Second task description',
          priority: 'HIGH',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Third task',
          description: 'Third task description',
          priority: 'MEDIUM',
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/boards/${board.id}/tasks`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const body = response.body as TaskListResponse;

    expect(body.data).toHaveLength(3);

    expect(body.data[0].title).toBe('Third task');
    expect(body.data[1].title).toBe('Second task');
    expect(body.data[2].title).toBe('First task');

    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });

    expect(body.data[0].labels).toEqual([]);
  });

  it('should filter tasks by status, priority, and search', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-filter-user',
        email: 'task-filter-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Filter Organization',
        description: 'Task filtering integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Filter Project',
        description: 'Project for task filtering',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Development Board',
        description: 'Board for task filtering',
      },
    });

    await prisma.task.createMany({
      data: [
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Fix authentication bug',
          description: 'Investigate authentication flow',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Fix payment bug',
          description: 'Investigate payment processing',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Create documentation',
          description: 'Document the authentication system',
          status: 'DONE',
          priority: 'HIGH',
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Update frontend',
          description: 'Update dashboard components',
          status: 'TODO',
          priority: 'LOW',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/boards/${board.id}/tasks`)
      .query({
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        search: 'authentication',
      })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const body = response.body as TaskListResponse;

    expect(body.data).toHaveLength(1);

    expect(body.data[0].title).toBe('Fix authentication bug');
    expect(body.data[0].status).toBe('IN_PROGRESS');
    expect(body.data[0].priority).toBe('HIGH');

    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('should paginate tasks correctly', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-pagination-user',
        email: 'task-pagination-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Pagination Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Pagination Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Pagination Board',
      },
    });

    await prisma.task.createMany({
      data: [
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Task 1',
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Task 2',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Task 3',
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Task 4',
          createdAt: new Date('2026-01-04T10:00:00.000Z'),
        },
        {
          boardId: board.id,
          createdById: user.id,
          title: 'Task 5',
          createdAt: new Date('2026-01-05T10:00:00.000Z'),
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/boards/${board.id}/tasks`)
      .query({
        page: 2,
        limit: 2,
      })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const body = response.body as TaskListResponse;

    expect(body.data).toHaveLength(2);

    expect(body.data[0].title).toBe('Task 3');
    expect(body.data[1].title).toBe('Task 2');

    expect(body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it('should allow a member to get a task', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-get-user',
        email: 'task-get-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Get Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Get Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Get Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task to retrieve',
        description: 'Task description',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 4.5,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const body = response.body as TaskResponse;

    expect(body.id).toBe(task.id);
    expect(body.boardId).toBe(board.id);
    expect(body.createdById).toBe(user.id);
    expect(body.title).toBe('Task to retrieve');
    expect(body.description).toBe('Task description');
    expect(body.status).toBe('IN_PROGRESS');
    expect(body.priority).toBe('HIGH');
    expect(body.estimatedHours).toBe(4.5);
    expect(body.assignedToId).toBeNull();
    expect(body.labels).toEqual([]);
  });

  it('should reject access to a task from another organization', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'task-owner-user',
        email: 'task-owner-user@example.com',
        passwordHash,
      },
    });

    const outsider = await prisma.user.create({
      data: {
        username: 'task-outsider-user',
        email: 'task-outsider-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Owner Organization',
      },
    });

    const outsiderOrganization = await prisma.organization.create({
      data: {
        name: 'Outsider Organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: outsider.id,
          organizationId: outsiderOrganization.id,
          role: 'MEMBER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Private Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Private Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: owner.id,
        title: 'Private task',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: outsider.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .get(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('should allow a member to update a task', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-update-user',
        email: 'task-update-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Update Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Update Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Update Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Original title',
        description: 'Original description',
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        estimatedHours: 2,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        title: 'Updated title',
        description: 'Updated description',
        dueDate: '2026-10-15T12:00:00.000Z',
        estimatedHours: 5.5,
      })
      .expect(200);

    const body = response.body as TaskResponse;

    expect(body.id).toBe(task.id);
    expect(body.title).toBe('Updated title');
    expect(body.description).toBe('Updated description');
    expect(body.estimatedHours).toBe(5.5);

    expect(new Date(body.dueDate!).toISOString()).toBe(
      '2026-10-15T12:00:00.000Z',
    );

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.title).toBe('Updated title');
    expect(persistedTask!.description).toBe('Updated description');
    expect(persistedTask!.estimatedHours).toBe(5.5);
    expect(persistedTask!.dueDate?.toISOString()).toBe(
      '2026-10-15T12:00:00.000Z',
    );
  });

  it('should allow a member to delete a task', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-delete-user',
        email: 'task-delete-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Delete Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Delete Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Delete Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task to delete',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const deletedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(deletedTask).toBeNull();
  });

  it('should allow a member to assign a task to another organization member', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-assigner',
        email: 'task-assigner@example.com',
        passwordHash,
      },
    });

    const assignee = await prisma.user.create({
      data: {
        username: 'task-assignee',
        email: 'task-assignee@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Assignment Organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: user.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
        {
          userId: assignee.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Assignment Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Assignment Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task to assign',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/assignee`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: assignee.id,
      })
      .expect(200);

    const body = response.body as TaskResponse;

    expect(body.id).toBe(task.id);
    expect(body.assignedToId).toBe(assignee.id);

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.assignedToId).toBe(assignee.id);
  });

  it('should reject assigning a task to a user from another organization', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-assignment-owner',
        email: 'task-assignment-owner@example.com',
        passwordHash,
      },
    });

    const externalUser = await prisma.user.create({
      data: {
        username: 'external-assignee',
        email: 'external-assignee@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Assignment Organization',
      },
    });

    const externalOrganization = await prisma.organization.create({
      data: {
        name: 'External Organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: user.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
        {
          userId: externalUser.id,
          organizationId: externalOrganization.id,
          role: 'MEMBER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Assignment Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Assignment Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task to assign',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/assignee`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: externalUser.id,
      })
      .expect(403);

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.assignedToId).toBeNull();
  });

  it('should allow a member to remove a task assignee', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-remove-assignee-user',
        email: 'task-remove-assignee-user@example.com',
        passwordHash,
      },
    });

    const assignee = await prisma.user.create({
      data: {
        username: 'task-remove-assignee-target',
        email: 'task-remove-assignee-target@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Remove Assignee Organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: user.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
        {
          userId: assignee.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Remove Assignee Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Remove Assignee Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Assigned task',
        assignedToId: assignee.id,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/tasks/${task.id}/assignee`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.assignedToId).toBeNull();
  });

  it('should allow a member to update a task status', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-status-user',
        email: 'task-status-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Status Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Status Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Status Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task with status',
        status: 'TODO',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/status`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        status: 'IN_PROGRESS',
      })
      .expect(200);

    const body = response.body as TaskResponse;

    expect(body.id).toBe(task.id);
    expect(body.status).toBe('IN_PROGRESS');

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.status).toBe('IN_PROGRESS');
  });

  it('should allow a member to update a task priority', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-priority-user',
        email: 'task-priority-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Priority Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Task Priority Project',
      },
    });

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Task Priority Board',
      },
    });

    const task = await prisma.task.create({
      data: {
        boardId: board.id,
        createdById: user.id,
        title: 'Task with priority',
        priority: 'LOW',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/priority`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        priority: 'URGENT',
      })
      .expect(200);

    const body = response.body as TaskResponse;

    expect(body.id).toBe(task.id);
    expect(body.priority).toBe('URGENT');

    const persistedTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
    });

    expect(persistedTask).not.toBeNull();
    expect(persistedTask!.priority).toBe('URGENT');
  });

  it('should reject access to a nonexistent task', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'task-nonexistent-user',
        email: 'task-nonexistent-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Task Nonexistent Organization',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .get('/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });
});
