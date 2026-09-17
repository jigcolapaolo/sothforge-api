import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { cleanDatabase } from '../cleanup';
import * as bcrypt from 'bcrypt';
import { Server } from 'node:http';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    await cleanDatabase(prisma);

    await app.init();
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
});
