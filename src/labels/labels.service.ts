import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelQueryDto } from './dto/label-query.dto';

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
}
