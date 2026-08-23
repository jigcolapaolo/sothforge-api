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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Create an organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid organization data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Get organizations of the current user' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findAllByUser(user.userId);
  }

  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not belong to this organization',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @Get(':organizationId')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findOne(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.findOne(organizationId, user.userId);
  }

  @ApiOperation({ summary: 'Update an organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid organization data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Delete an organization' })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the owner can delete the organization',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Add a member to an organization' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid member data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({
    status: 200,
    description: 'Members retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not belong to this organization',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @Get(':organizationId/members')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  getMembers(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getMembers(organizationId);
  }

  @ApiOperation({ summary: 'Update a member role' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid role',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Transfer organization ownership' })
  @ApiResponse({
    status: 200,
    description: 'Ownership transferred successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transfer request',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the owner can transfer ownership',
  })
  @ApiResponse({
    status: 404,
    description: 'Target user is not a member of the organization',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Leave an organization' })
  @ApiResponse({
    status: 204,
    description: 'Organization left successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Owner must transfer ownership before leaving',
  })
  @ApiResponse({
    status: 404,
    description: 'User does not belong to this organization',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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

  @ApiOperation({ summary: 'Remove a member from an organization' })
  @ApiResponse({
    status: 204,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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
