import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/database/prisma.service';
import { userPublicSelect } from 'src/users/constants/user-select';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'src/generated/prisma/client';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return the public user data', async () => {
      const userId = 'user-1';

      const user = {
        id: userId,
        username: 'juan',
        email: 'juan@example.com',
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
        select: userPublicSelect,
      });

      expect(result).toEqual(user);
    });
  });

  describe('findByEmail', () => {
    it('should return the user by email', async () => {
      const email = 'juan@example.com';

      const user = {
        id: 'user-1',
        username: 'juan',
        email,
        passwordHash: 'hashed-password',
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail(email);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email,
        },
      });

      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should update the user and return public data', async () => {
      const userId = 'user-1';

      const dto = {
        username: 'new-username',
        email: 'new@example.com',
      };

      const updatedUser = {
        id: userId,
        username: dto.username,
        email: dto.email,
      };

      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, dto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
        data: dto,
        select: userPublicSelect,
      });

      expect(result).toEqual(updatedUser);
    });

    it('should throw ConflictException when username or email already exists', async () => {
      const userId = 'user-1';

      const dto = {
        username: 'existing-user',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const error = Object.create(
        Prisma.PrismaClientKnownRequestError.prototype,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      error.code = 'P2002';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      error.message = 'Unique constraint failed';

      prisma.user.update.mockRejectedValue(error);

      await expect(service.update(userId, dto)).rejects.toThrow(
        'Username or email already exists.',
      );
    });

    it('should rethrow unexpected errors', async () => {
      const userId = 'user-1';

      const dto = {
        username: 'new-username',
      };

      const error = new Error('Database connection failed');

      prisma.user.update.mockRejectedValue(error);

      await expect(service.update(userId, dto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('changePassword', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      const userId = 'user-1';

      const dto = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        'User not found.',
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the current password is incorrect', async () => {
      const userId = 'user-1';

      const dto = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };

      prisma.user.findFirst.mockResolvedValue({
        passwordHash: 'stored-hash',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        'Current password is incorrect.',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.currentPassword,
        'stored-hash',
      );

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should change the password when the current password is correct', async () => {
      const userId = 'user-1';

      const dto = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      const newPasswordHash = 'new-hashed-password';

      prisma.user.findFirst.mockResolvedValue({
        passwordHash: 'stored-hash',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(newPasswordHash);
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword(userId, dto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.currentPassword,
        'stored-hash',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.newPassword, 12);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      expect(result).toEqual({
        message: 'Password changed successfully',
      });
    });

    it('should use 12 salt rounds when hashing the new password', async () => {
      const userId = 'user-1';

      const dto = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      prisma.user.findFirst.mockResolvedValue({
        passwordHash: 'stored-hash',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});

      await service.changePassword(userId, dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.newPassword, 12);
    });
  });
});
