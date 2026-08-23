import { IsUUID } from 'class-validator';

export class CreateMemberDto {
  @IsUUID()
  userId!: string;
}
