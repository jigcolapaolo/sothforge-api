import { Project } from 'src/generated/prisma/client';

export interface ProjectRequest {
  params: {
    organizationId: string;
    projectId: string;
  };
  project: Project;
}
