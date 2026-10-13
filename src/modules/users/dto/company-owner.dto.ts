import { IsOptional, IsString } from 'class-validator';

export class CompanyOwnerDto {
  @IsString()
  fullName: string;

  @IsString()
  rut: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}