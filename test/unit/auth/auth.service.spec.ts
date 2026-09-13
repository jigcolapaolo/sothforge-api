import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';

jest.mock('bcrypt');

jest.mock('src/generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  let prisma: {
    user: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    session: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let jwtService: {
    signAsync: jest.Mock;
  };

  let configService: {
    getOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = {
        id: 'user-id',
        username: 'john_doe',
        email: 'john@example.com',
        avatar: null,
        createdAt: new Date(),
      };

      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123!',
      });

      expect(result).toEqual(createdUser);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'john_doe' }, { email: 'john@example.com' }],
        },
        select: {
          username: true,
          email: true,
        },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'john_doe',
          email: 'john@example.com',
          passwordHash: 'hashed-password',
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          createdAt: true,
        },
      });
    });

    it('should throw ConflictException when username or email is already in use', async () => {
      prisma.user.findFirst.mockResolvedValue({
        username: 'john_doe',
        email: 'john@example.com',
      });

      await expect(
        service.register({
          username: 'john_doe',
          email: 'john@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(
        new ConflictException('Username or email already in use'),
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('validateCredentials', () => {
    it('should return the user without passwordHash when credentials are valid', async () => {
      const user = {
        id: 'user-id',
        username: 'john_doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        avatar: null,
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials(
        'john@example.com',
        'Password123!',
      );

      expect(result).toEqual({
        id: 'user-id',
        username: 'john_doe',
        email: 'john@example.com',
        avatar: null,
        createdAt: user.createdAt,
      });

      expect(result).not.toHaveProperty('passwordHash');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
        },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCredentials('john@example.com', 'Password123!'),
      ).rejects.toThrow('Invalid credentials');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
        },
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = {
        id: 'user-id',
        username: 'john_doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        avatar: null,
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateCredentials('john@example.com', 'WrongPassword123!'),
      ).rejects.toThrow('Invalid credentials');

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'WrongPassword123!',
        'hashed-password',
      );
    });
  });

  describe('login', () => {
    it('should login successfully and create a session', async () => {
      const user = {
        id: 'user-id',
        username: 'john_doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        avatar: null,
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.signAsync.mockResolvedValue('access-token');

      configService.getOrThrow.mockReturnValue('7d');

      prisma.session.create.mockResolvedValue({
        id: 'session-id',
      });

      prisma.user.update.mockResolvedValue(user);

      const result = await service.login({
        email: 'john@example.com',
        password: 'Password123!',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toEqual(expect.any(String));

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          refreshTokenHash: expect.any(String),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: expect.any(Date),
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: 'user-id',
        },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          lastLogin: expect.any(Date),
        },
      });
    });
  });

  describe('refresh', () => {
    it('should rotate the refresh token successfully', async () => {
      const session = {
        id: 'session-id',
        userId: 'user-id',
        refreshTokenHash: 'old-refresh-token-hash',
        expiresAt: new Date('2030-01-01'),
        revokedAt: null,
      };

      const user = {
        id: 'user-id',
        email: 'john@example.com',
      };

      prisma.session.findFirst.mockResolvedValue(session);
      prisma.user.findUnique.mockResolvedValue(user);

      jwtService.signAsync.mockResolvedValue('new-access-token');
      configService.getOrThrow.mockReturnValue('7d');

      prisma.session.update.mockResolvedValue({
        ...session,
        revokedAt: new Date(),
      });

      prisma.session.create.mockResolvedValue({
        id: 'new-session-id',
      });

      prisma.$transaction.mockResolvedValue([
        {
          ...session,
          revokedAt: new Date(),
        },
        {
          id: 'new-session-id',
        },
      ]);

      const result = await service.refresh('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));

      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          refreshTokenHash: expect.any(String),
          revokedAt: null,
          expiresAt: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            gt: expect.any(Date),
          },
        },
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-id',
        },
        select: {
          id: true,
          email: true,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(prisma.session.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when session user does not exist', async () => {
      const session = {
        id: 'session-id',
        userId: 'user-id',
        refreshTokenHash: 'old-refresh-token-hash',
        expiresAt: new Date('2030-01-01'),
        revokedAt: null,
      };

      prisma.session.findFirst.mockResolvedValue(session);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-id',
        },
        select: {
          id: true,
          email: true,
        },
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
