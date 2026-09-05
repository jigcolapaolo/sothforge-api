import { Controller } from '@nestjs/common';
import { LabelsService } from '../labels.service';

@Controller('organizations/:organizationId/labels')
export class OrganizationLabelsController {
  constructor(private readonly labelsService: LabelsService) {}
}
