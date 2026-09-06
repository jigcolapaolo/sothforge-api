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

@Controller('organizations/:organizationId/labels')
export class OrganizationLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

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

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: LabelQueryDto,
  ) {
    return this.labelsService.findAll(organizationId, query);
  }
}
