import { IsEnum } from 'class-validator';
import { OrganizationRole } from 'src/generated/prisma/enums';

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
