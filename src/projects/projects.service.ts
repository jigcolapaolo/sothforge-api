import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(organizationId: string, dto: CreateProjectDto) {
    const project = this.prisma.project.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    await this.redis.delete(`projects:${organizationId}`);

    return project;
  }

  async findAll(organizationId: string) {
    const cacheKey = `projects:${organizationId}`;

    const cachedProjects = await this.redis.get(cacheKey);

    if (cachedProjects) {
      return JSON.parse(cachedProjects) as typeof projects;
    }

    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await this.redis.setWithTtl(cacheKey, JSON.stringify(projects), 60);

    return projects;
  }

  async findOne(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updatedProject = this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    await this.redis.delete(`projects:${project.organizationId}`);

    return updatedProject;
  }

  async remove(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    await this.redis.delete(`projects:${project.organizationId}`);
  }
}
