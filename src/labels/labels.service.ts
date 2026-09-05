import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateLabelDto) {
    const existingLabel = await this.prisma.label.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        'A label with this name already exists in the organization',
      );
    }

    return this.prisma.label.create({
      data: {
        organizationId,
        name: dto.name,
        color: dto.color,
      },
    });
  }
}
