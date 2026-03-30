import { IsUUID, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class AssignMemberDto {
  @IsUUID()
  @IsNotEmpty()
  collaboratorId!: string;

  @IsString()
  @IsOptional()
  roleOnProject?: string;
}
