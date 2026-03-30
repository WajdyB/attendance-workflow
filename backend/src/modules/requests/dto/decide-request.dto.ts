import { IsOptional, IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class DecideRequestDto {
  @IsUUID()
  @IsNotEmpty()
  managerId!: string;

  @IsString()
  @IsOptional()
  decisionComment?: string;
}
