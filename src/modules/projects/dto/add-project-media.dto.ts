import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ProjectMediaType } from '../entities/project-media.entity';

export class AddProjectMediaDto {
  @IsEnum(ProjectMediaType)
  type: ProjectMediaType;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;
}
