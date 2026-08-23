import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from 'src/auth/guards/organization.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findAllByUser(user.userId);
  }

  @Get(':organizationId')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findOne(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.findOne(organizationId, user.userId);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':organizationId')
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  update(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, dto);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':organizationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER)
  remove(@Param('organizationId') organizationId: string) {
    return this.organizationsService.remove(organizationId);
  }

  // Members

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post(':organizationId/members')
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  createMember(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.organizationsService.createMember(organizationId, dto);
  }

  @Get(':organizationId/members')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  getMembers(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getMembers(organizationId);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Patch(':organizationId/members/:userId')
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  updateMemberRole(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      organizationId,
      userId,
      dto,
    );
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60_000,
    },
  })
  @Patch(':organizationId/transfer-ownership')
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER)
  transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.organizationsService.transferOwnership(
      user.userId,
      organizationId,
      dto.userId,
    );
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':organizationId/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  leaveOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationsService.leaveOrganization(
      user.userId,
      organizationId,
    );
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Delete(':organizationId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.organizationsService.removeMember(
      organizationId,
      userId,
      user.userId,
    );
  }
}
