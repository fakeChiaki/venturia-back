import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class ReviewApplicationDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus.ACCEPTED | ApplicationStatus.REJECTED;
}