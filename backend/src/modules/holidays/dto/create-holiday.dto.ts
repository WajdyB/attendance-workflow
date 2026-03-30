import { IsString, IsDateString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  date!: string;

  @IsInt()
  @IsOptional()
  year?: number;
}
