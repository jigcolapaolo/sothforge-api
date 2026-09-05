import { IsOptional, IsString } from 'class-validator';

export class LabelQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
