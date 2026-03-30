import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { LeaveType, RequestType } from '@prisma/client';

export class CreateRequestDto {
  @IsUUID()
  @IsNotEmpty()
  submittedBy!: string;

  @IsEnum(RequestType)
  requestType!: RequestType;

  @IsEnum(LeaveType)
  @IsOptional()
  leaveType?: LeaveType;

  @IsDateString()
  @IsOptional()
  leaveStartDate?: string;

  @IsDateString()
  @IsOptional()
  leaveEndDate?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
