import {
  IsEmail,
  IsString,
  MinLength,
  IsDateString,
  IsPhoneNumber,
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

  @IsString()
  cnssNumber!: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  accountStatus?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
