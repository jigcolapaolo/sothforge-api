import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { LabelsService } from '../labels.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { LabelGuard } from '../guards/label.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { UpdateLabelDto } from '../dto/update-label.dto';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get(':labelId')
  @UseGuards(JwtAuthGuard, LabelGuard)
  findOne(@Param('labelId') labelId: string) {
    return this.labelsService.findOne(labelId);
  }

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
}
