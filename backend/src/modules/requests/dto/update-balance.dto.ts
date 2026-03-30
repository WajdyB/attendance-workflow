import { IsNumber, IsInt, IsPositive, IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateBalanceDto {
  @IsNumber()
  @IsPositive()
  allocatedDays!: number;

  @IsInt()
  year!: number;
}
