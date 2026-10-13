import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Methodology } from '../../../common/enums/methodology.enum';
import type { AvailabilitySchedule } from '../../users/entities/natural-person-profile.entity';
import type { FieldVisibility } from '../entities/project.entity';

export class RoleRequirementDto {
  @IsInt()
  @Min(1)
  roleId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyHours?: number;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  privateDescription?: string;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  technicalAreaIds!: number[];

  @IsEnum(Methodology)
  @IsNotEmpty()
  methodology!: Methodology;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsPositive()
  fundingGoal!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  weeklyHours?: number;

  @IsOptional()
  schedule?: AvailabilitySchedule;

  @IsObject()
  @IsOptional()
  fieldVisibility?: FieldVisibility;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleRequirementDto)
  @IsOptional()
  roleRequirements?: RoleRequirementDto[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  interestAreaIds?: number[];
}
