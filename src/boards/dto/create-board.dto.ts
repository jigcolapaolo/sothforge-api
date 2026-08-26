import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
