import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @IsUUID()
  userId!: string;
}
