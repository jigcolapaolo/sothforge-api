import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { cleanDatabase } from '../cleanup';
import * as bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import { RedisService } from 'src/redis/redis.service';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

describe('AuthController (integration)', () => {
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

  it('should register a new user', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/auth/register')
      .send({
        username: 'integration-user-2',
        email: 'integration2@example.com',
        password: 'Password123!',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        username: 'integration-user-2',
        email: 'integration2@example.com',
      }),
    );

    const user = await prisma.user.findUnique({
      where: {
        email: 'integration2@example.com',
      },
    });

    expect(user).not.toBeNull();
    expect(user?.username).toBe('integration-user-2');
  });

  it('should login an existing user', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'login-user',
        email: 'login@example.com',
        passwordHash,
      },
    });

    const response = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password,
      })
      .expect(201);

    const body = response.body as LoginResponse;

    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');

    expect(body.user.id).toBe(user.id);
    expect(body.user.username).toBe('login-user');
    expect(body.user.email).toBe('login@example.com');

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser?.lastLogin).not.toBeNull();

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessions).toHaveLength(1);
  });

  it('should refresh an access token using a valid refresh token', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'refresh-user',
        email: 'refresh@example.com',
        passwordHash,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'refresh@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const oldRefreshToken = loginBody.refreshToken;

    const oldSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
      },
    });

    expect(oldSession).not.toBeNull();

    const refreshResponse = await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(201);

    const refreshBody = refreshResponse.body as RefreshResponse;

    expect(typeof refreshBody.accessToken).toBe('string');
    expect(refreshBody.accessToken.split('.')).toHaveLength(3);

    expect(typeof refreshBody.refreshToken).toBe('string');
    expect(refreshBody.refreshToken).not.toBe(oldRefreshToken);

    const revokedSession = await prisma.session.findUnique({
      where: {
        id: oldSession!.id,
      },
    });

    expect(revokedSession?.revokedAt).not.toBeNull();

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessions).toHaveLength(2);

    const activeSessions = sessions.filter(
      (session) => session.revokedAt === null,
    );

    expect(activeSessions).toHaveLength(1);
  });

  it('should reject a reused refresh token', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        username: 'refresh-reuse-user',
        email: 'refresh-reuse@example.com',
        passwordHash,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'refresh-reuse@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const oldRefreshToken = loginBody.refreshToken;

    await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(201);

    await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(401);
  });

  it('should logout and revoke the current session', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'logout-user',
        email: 'logout@example.com',
        passwordHash,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'logout@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const sessionBeforeLogout = await prisma.session.findFirst({
      where: {
        userId: user.id,
      },
    });

    expect(sessionBeforeLogout).not.toBeNull();

    await request(app.getHttpServer() as Server)
      .post('/auth/logout')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(204);

    const sessionAfterLogout = await prisma.session.findUnique({
      where: {
        id: sessionBeforeLogout!.id,
      },
    });

    expect(sessionAfterLogout?.revokedAt).not.toBeNull();
  });

  it('should reject a refresh token after logout', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        username: 'logout-refresh-user',
        email: 'logout-refresh@example.com',
        passwordHash,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'logout-refresh@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .post('/auth/logout')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(204);

    await request(app.getHttpServer() as Server)
      .post('/auth/refresh')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(401);
  });

  it('should revoke all sessions for the authenticated user', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'logout-all-user',
        email: 'logout-all@example.com',
        passwordHash,
      },
    });

    const firstLoginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'logout-all@example.com',
        password,
      })
      .expect(201);

    const firstLoginBody = firstLoginResponse.body as LoginResponse;

    const secondLoginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'logout-all@example.com',
        password,
      })
      .expect(201);

    const secondLoginBody = secondLoginResponse.body as LoginResponse;

    const sessionsBeforeLogout = await prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
    });

    expect(sessionsBeforeLogout).toHaveLength(2);

    await request(app.getHttpServer() as Server)
      .post('/auth/logout-all')
      .set('Authorization', `Bearer ${firstLoginBody.accessToken}`)
      .expect(204);

    const sessionsAfterLogout = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsAfterLogout).toHaveLength(2);

    const activeSessions = sessionsAfterLogout.filter(
      (session) => session.revokedAt === null,
    );

    expect(activeSessions).toHaveLength(0);

    expect(firstLoginBody.refreshToken).not.toBe(secondLoginBody.refreshToken);
  });

  it('should reject logout-all without authentication', async () => {
    await request(app.getHttpServer() as Server)
      .post('/auth/logout-all')
      .expect(401);
  });
});
