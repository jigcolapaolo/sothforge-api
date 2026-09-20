import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';

import { cleanDatabase } from '../integration/cleanup';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type OrganizationResponse = {
  id: string;
  name: string;
  description: string | null;
};

type ProjectResponse = {
  id: string;
  organizationId: string;
  name: string;
};

type BoardResponse = {
  id: string;
  projectId: string;
  name: string;
};

type TaskResponse = {
  id: string;
  boardId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToId: string | null;
};

describe('Business Flow E2E', () => {
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

  it('should complete the basic business flow', async () => {
    const password = 'Password123!';

    // 1. Register
    const registerResponse = await request(app.getHttpServer() as Server)
      .post('/auth/register')
      .send({
        username: 'business-flow-user',
        email: 'business-flow@example.com',
        password,
      })
      .expect(201);

    const registeredUser = registerResponse.body as {
      id: string;
      username: string;
      email: string;
    };

    expect(registeredUser.username).toBe('business-flow-user');
    expect(registeredUser.email).toBe('business-flow@example.com');

    // 2. Login
    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'business-flow@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    expect(loginBody.accessToken).toBeDefined();
    expect(loginBody.user.id).toBe(registeredUser.id);

    const authorization = `Bearer ${loginBody.accessToken}`;

    // 3. Create organization
    const organizationResponse = await request(app.getHttpServer() as Server)
      .post('/organizations')
      .set('Authorization', authorization)
      .send({
        name: 'E2E Organization',
        description: 'Organization created during E2E flow',
      })
      .expect(201);

    const organization = organizationResponse.body as OrganizationResponse;

    expect(organization.name).toBe('E2E Organization');

    // 4. Create project
    const projectResponse = await request(app.getHttpServer() as Server)
      .post(`/organizations/${organization.id}/projects`)
      .set('Authorization', authorization)
      .send({
        name: 'E2E Project',
        description: 'Project created during E2E flow',
      })
      .expect(201);

    const project = projectResponse.body as ProjectResponse;

    expect(project.organizationId).toBe(organization.id);
    expect(project.name).toBe('E2E Project');

    // 5. Create board
    const boardResponse = await request(app.getHttpServer() as Server)
      .post(`/projects/${project.id}/boards`)
      .set('Authorization', authorization)
      .send({
        name: 'E2E Board',
        description: 'Board created during E2E flow',
      })
      .expect(201);

    const board = boardResponse.body as BoardResponse;

    expect(board.projectId).toBe(project.id);
    expect(board.name).toBe('E2E Board');

    // 6. Create task
    const taskResponse = await request(app.getHttpServer() as Server)
      .post(`/boards/${board.id}/tasks`)
      .set('Authorization', authorization)
      .send({
        title: 'E2E Task',
        description: 'Task created during E2E flow',
        priority: 'HIGH',
        estimatedHours: 4,
      })
      .expect(201);

    const task = taskResponse.body as TaskResponse;

    expect(task.boardId).toBe(board.id);
    expect(task.createdById).toBe(registeredUser.id);
    expect(task.title).toBe('E2E Task');
    expect(task.status).toBe('TODO');
    expect(task.priority).toBe('HIGH');
    expect(task.assignedToId).toBeNull();

    // 7. Assign task to the authenticated user
    const assignResponse = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/assignee`)
      .set('Authorization', authorization)
      .send({
        userId: registeredUser.id,
      })
      .expect(200);

    const assignedTask = assignResponse.body as TaskResponse;

    expect(assignedTask.id).toBe(task.id);
    expect(assignedTask.assignedToId).toBe(registeredUser.id);

    // 8. Change status
    const statusResponse = await request(app.getHttpServer() as Server)
      .patch(`/tasks/${task.id}/status`)
      .set('Authorization', authorization)
      .send({
        status: 'IN_PROGRESS',
      })
      .expect(200);

    const updatedTask = statusResponse.body as TaskResponse;

    expect(updatedTask.id).toBe(task.id);
    expect(updatedTask.status).toBe('IN_PROGRESS');

    // 9. Retrieve task
    const getTaskResponse = await request(app.getHttpServer() as Server)
      .get(`/tasks/${task.id}`)
      .set('Authorization', authorization)
      .expect(200);

    const finalTask = getTaskResponse.body as TaskResponse;

    expect(finalTask.id).toBe(task.id);
    expect(finalTask.boardId).toBe(board.id);
    expect(finalTask.createdById).toBe(registeredUser.id);
    expect(finalTask.title).toBe('E2E Task');
    expect(finalTask.status).toBe('IN_PROGRESS');
    expect(finalTask.priority).toBe('HIGH');
    expect(finalTask.assignedToId).toBe(registeredUser.id);
  });
});
