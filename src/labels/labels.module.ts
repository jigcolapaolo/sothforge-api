import { Module } from '@nestjs/common';
import { LabelsController } from './controllers/labels.controller';
import { LabelsService } from './labels.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { OrganizationLabelsController } from './controllers/organization-labels.controller';
import { LabelGuard } from './guards/label.guard';
import { TasksModule } from 'src/tasks/tasks.module';
import { TaskLabelsController } from './controllers/task-labels.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    TasksModule,
    AuthorizationModule,
  ],
  controllers: [
    OrganizationLabelsController,
    LabelsController,
    TaskLabelsController,
  ],
  providers: [LabelsService, LabelGuard],
})
export class LabelsModule {}
