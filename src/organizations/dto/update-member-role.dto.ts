import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationRole } from 'src/generated/prisma/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: OrganizationRole,
    example: OrganizationRole.MEMBER,
    description: 'New role assigned to the organization member',
  })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
