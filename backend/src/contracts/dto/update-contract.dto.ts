import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';
import { ContractType } from '@prisma/client';

export class UpdateContractDto {
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  weeklyHours?: number;

  @IsNumber()
  @IsOptional()
  baseSalary?: number;

  @IsNumber()
  @IsOptional()
  netSalary?: number;

  @IsNumber()
  @IsOptional()
  bonuses?: number;

  @IsString()
  @IsOptional()
  benefitsInKind?: string;
}
