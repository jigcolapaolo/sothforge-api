import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Usuario público
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
  }

  // Usuario interno para Auth (Con passwordHash)
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
    avatar?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }
}
