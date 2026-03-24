import {
  IsEmail,
  IsString,
  MinLength,
  IsDateString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  personalEmail!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsDateString()
  birthdate!: string;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsEmail()
  workEmail!: string;

  @IsString()
  jobTitle!: string;

  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  bankBicSwift?: string;

  @IsOptional()
  @IsString()
  rib?: string;

  @IsOptional()
  @IsString()
  phoneFixed?: string;

  @IsString()
  cnssNumber!: string;

  @IsOptional()
  @IsString()
  pictureUrl?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  accountStatus?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
