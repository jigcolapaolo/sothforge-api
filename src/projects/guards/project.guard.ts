import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ProjectRequest } from '../types/project.request';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ProjectRequest>();

    const organizationId = request.params.organizationId;
    const projectId = request.params.projectId;

    if (!organizationId || !projectId) {
      throw new ForbiddenException('Project access denied');
    }

    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new ForbiddenException(
        'Project does not belong to this organization',
      );
    }

    request.project = project;

    return true;
  }
}
