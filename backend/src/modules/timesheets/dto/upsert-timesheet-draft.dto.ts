import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimesheetEntryInputDto {
  @IsUUID()
  projectId!: string;

  @IsDateString()
  entryDate!: string;

  @IsString()
  @IsOptional()
  taskName?: string;

  @IsNumber()
  @Min(0.25)
  hours!: number;

  @IsString()
  @IsOptional()
  activityDescription?: string;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class UpsertTimesheetDraftDto {
  @IsUUID()
  userId!: string;

  @IsDateString()
  weekStartDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryInputDto)
  entries!: TimesheetEntryInputDto[];
}
