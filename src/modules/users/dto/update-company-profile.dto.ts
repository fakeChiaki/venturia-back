import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { CompanyOwnerDto } from './company-owner.dto';

export class UpdateCompanyProfileDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  businessHours?: Record<string, { from: string; to: string }>;

  @IsString()
  @IsOptional()
  policies?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyOwnerDto)
  @IsOptional()
  owners?: CompanyOwnerDto[];
}