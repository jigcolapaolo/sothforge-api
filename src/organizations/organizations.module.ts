import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaModule } from 'src/database/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { OrganizationGuard } from './guards/organization.guard';
import { AuthorizationModule } from 'src/common/authorization/authorization.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, AuditModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationGuard],
  exports: [OrganizationGuard],
})
export class OrganizationsModule {}
