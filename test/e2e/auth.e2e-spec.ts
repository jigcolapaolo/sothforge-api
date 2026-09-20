import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';

import { cleanDatabase } from '../integration/cleanup';

type RegisterResponse = {
  id: string;
  username: string;
  email: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

describe('Authentication E2E', () => {
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

  it('should complete the authentication lifecycle', async () => {
    const password = 'Password123!';

    // 1. Register
    const registerResponse = await request(app.getHttpServer() as Server)
      .post('/auth/register')
      .send({
        username: 'e2e-user',
        email: 'e2e-user@example.com',
        password,
      })
      .expect(201);

    const registerBody = registerResponse.body as RegisterResponse;

    expect(registerBody.username).toBe('e2e-user');
    expect(registerBody.email).toBe('e2e-user@example.com');

    // 2. Login
    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'e2e-user@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    expect(loginBody.accessToken).toBeDefined();
    expect(loginBody.refreshToken).toBeDefined();
    expect(loginBody.user.id).toBe(registerBody.id);

    // 3. Refresh
    const refreshResponse = await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(201);

    const refreshBody = refreshResponse.body as LoginResponse;

    expect(refreshBody.accessToken).toBeDefined();
    expect(refreshBody.refreshToken).toBeDefined();
    expect(refreshBody.refreshToken).not.toBe(loginBody.refreshToken);

    // 4. Logout using the rotated refresh token
    await request(app.getHttpServer() as Server)
      .post('/auth/logout')
      .send({
        refreshToken: refreshBody.refreshToken,
      })
      .expect(204);

    // 5. The revoked refresh token can no longer be used
    await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: refreshBody.refreshToken,
      })
      .expect(401);
  });
});
