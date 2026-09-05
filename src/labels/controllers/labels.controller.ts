import { Controller } from '@nestjs/common';
import { LabelsService } from '../labels.service';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}
}
