import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Name of the organization',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Organization for managing software development projects',
    description: 'Optional description of the organization',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
