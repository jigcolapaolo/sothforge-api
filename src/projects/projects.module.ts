import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectGuard } from './guards/project.guard';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { OrganizationProjectsController } from './controllers/organization-projects.controller';

@Module({
  imports: [PrismaModule, AuthModule, OrganizationsModule, AuthorizationModule],
  controllers: [OrganizationProjectsController, ProjectsController],
  providers: [ProjectsService, ProjectGuard],
  exports: [ProjectGuard],
})
export class ProjectsModule {}
