import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string;

  @IsString()
  @MinLength(2, { message: 'Code must be at least 2 characters' })
  code!: string;
}
