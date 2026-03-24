import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RejectTimesheetDto {
  @IsUUID()
  managerId!: string;

  @IsString()
  @IsNotEmpty()
  comment!: string;
}
