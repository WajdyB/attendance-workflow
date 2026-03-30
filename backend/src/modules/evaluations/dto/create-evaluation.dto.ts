import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsUUID,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { EvaluationType } from '@prisma/client';

export class CreateEvaluationDto {
  @IsUUID()
  @IsNotEmpty()
  collaboratorId!: string;

  @IsEnum(EvaluationType)
  @IsOptional()
  evaluationType?: EvaluationType;

  @IsString()
  @IsOptional()
  period?: string;

  @IsDateString()
  @IsOptional()
  reviewDate?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  globalScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  technicalScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  softSkillScore?: number;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;
}
