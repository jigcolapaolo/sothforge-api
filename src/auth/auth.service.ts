import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'src/generated/prisma/client';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: {
        username: true,
        email: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username or email is already in use');
      }

      throw error;
    }
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateCredentials(
      loginDto.email,
      loginDto.password,
    );

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }
}
