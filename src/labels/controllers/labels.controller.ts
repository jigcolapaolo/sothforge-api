import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { LabelsService } from '../labels.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { LabelGuard } from '../guards/label.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateLabelDto } from '../dto/update-label.dto';
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
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @ApiOperation({ summary: 'Get a label by ID' })
  @ApiParam({
    name: 'labelId',
    description: 'Label ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Label retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Label not found',
  })
  @Get(':labelId')
  @UseGuards(JwtAuthGuard, LabelGuard)
  findOne(@Param('labelId') labelId: string) {
    return this.labelsService.findOne(labelId);
  }

  @ApiOperation({ summary: 'Update a label' })
  @ApiParam({
    name: 'labelId',
    description: 'Label ID',
  })
  @ApiBody({
    type: UpdateLabelDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Label updated successfully',
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
    status: 404,
    description: 'Label not found',
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
  @Patch(':labelId')
  @UseGuards(JwtAuthGuard, LabelGuard, RolesGuard)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
  )
  update(@Param('labelId') labelId: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(labelId, dto);
  }

  @ApiOperation({ summary: 'Delete a label' })
  @ApiParam({
    name: 'labelId',
    description: 'Label ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Label deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Label not found',
  })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Delete(':labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, LabelGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  remove(@Param('labelId') labelId: string) {
    return this.labelsService.remove(labelId);
  }
}
