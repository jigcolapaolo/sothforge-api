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
    };
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
      },
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
});
