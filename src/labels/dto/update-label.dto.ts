import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}
