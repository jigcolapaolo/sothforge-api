import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({
    example: 'Backend',
    description: 'Label name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: '#3B82F6',
    description: 'Label color in hexadecimal format',
  })
  @IsString()
  @IsNotEmpty()
  color!: string;
}
