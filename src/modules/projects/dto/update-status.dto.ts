import { IsEnum } from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

export class UpdateStatusDto {
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;
}
