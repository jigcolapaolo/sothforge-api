import {
  BadRequestException,
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

  async findOne(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: {
        id: labelId,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    return label;
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

  async remove(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: {
        id: labelId,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.prisma.label.delete({
      where: {
        id: labelId,
      },
    });
  }

  async assignToTask(
    taskId: string,
    labelId: string,
    taskOrganizationId: string,
  ) {
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

    if (label.organizationId !== taskOrganizationId) {
      throw new BadRequestException(
        'The label does not belong to the task organization',
      );
    }

    const existingTaskLabel = await this.prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
    });

    if (existingTaskLabel) {
      throw new ConflictException('The label is already assigned to this task');
    }

    return this.prisma.taskLabel.create({
      data: {
        taskId,
        labelId,
      },
    });
  }
}
