import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user';
import { OrganizationGuard } from './guards/organization.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('register')
  create(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  // Revoca la sesion actual
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  // Revoca todas las sesiones de usuario
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.userId);
  }

  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Get('test-organization/:organizationId')
  testOrganization(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Authorization successful',
      user,
    };
  }
}
