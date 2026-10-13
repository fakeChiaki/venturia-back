import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Methodology } from '../../../common/enums/methodology.enum';
import type { AvailabilitySchedule } from '../entities/natural-person-profile.entity';

export class CompleteOnboardingDto {
  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  technicalAreaIds: number[];

  @ApiProperty({ enum: Methodology })
  @IsEnum(Methodology)
  methodology: Methodology;

  @ApiProperty({ example: 20, minimum: 1, maximum: 60 })
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(60)
  weeklyHours: number;

  @ApiPropertyOptional({ example: 'America/Santiago' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    example: { days: ['mon', 'wed'], from: '18:00', to: '21:00' },
  })
  @IsOptional()
  availability?: AvailabilitySchedule;

  @ApiProperty({ type: [Number], example: [1, 3] })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];

  @ApiProperty({ type: [Number], example: [2, 5] })
  @IsArray()
  @IsInt({ each: true })
  interestAreaIds: number[];
}
