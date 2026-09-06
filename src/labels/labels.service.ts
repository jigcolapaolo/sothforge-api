import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelQueryDto } from './dto/label-query.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateLabelDto) {
    await this.ensureNameIsAvailable(organizationId, dto.name);

    return this.prisma.label.create({
      data: {
        organizationId,
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async findAll(organizationId: string, query: LabelQueryDto) {
    return this.prisma.label.findMany({
      where: {
        organizationId,
        ...(query.search && {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async update(labelId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findUnique({
      where: {
        id: labelId,
      },
      select: {
        organizationId: true,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    if (dto.name) {
      await this.ensureNameIsAvailable(label.organizationId, dto.name, labelId);
    }

    return this.prisma.label.update({
      where: {
        id: labelId,
      },
      data: {
        name: dto.name,
        color: dto.color,
      },
    });
  }

  private async ensureNameIsAvailable(
    organizationId: string,
    name: string,
    excludeLabelId?: string,
  ) {
    const existingLabel = await this.prisma.label.findFirst({
      where: {
        organizationId,
        name,
        ...(excludeLabelId && {
          NOT: {
            id: excludeLabelId,
          },
        }),
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        'A label with this name already exists in the organization',
      );
    }
  }
}
