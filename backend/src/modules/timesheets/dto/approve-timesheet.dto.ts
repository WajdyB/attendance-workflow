import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveTimesheetDto {
  @IsUUID()
  managerId!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
