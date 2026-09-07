import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LabelsService } from '../labels.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from 'src/organizations/guards/organization.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { CreateLabelDto } from '../dto/create-label.dto';
import { LabelQueryDto } from '../dto/label-query.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Labels')
@ApiBearerAuth()
@Controller('organizations/:organizationId/labels')
export class OrganizationLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @ApiOperation({ summary: 'Create a label in an organization' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
  })
  @ApiBody({
    type: CreateLabelDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Label created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 409,
    description: 'A label with this name already exists',
  })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.create(organizationId, dto);
  }

  @ApiOperation({ summary: 'List labels from an organization' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Labels retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: LabelQueryDto,
  ) {
    return this.labelsService.findAll(organizationId, query);
  }
}
