import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Methodology } from '../../../common/enums/methodology.enum';
import { ProjectStatus } from '../../projects/entities/project.entity';

export class FeedQueryDto {
  /** UUID del perfil de persona natural para calcular/usar score de afinidad */
  @IsUUID()
  @IsOptional()
  profileId?: string;

  /** Estado del proyecto a filtrar. Por defecto: open */
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  /** Filtro por área técnica (id numérico) */
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  areaTecnica?: number;

  /** Filtro por metodología */
  @IsEnum(Methodology)
  @IsOptional()
  metodologia?: Methodology;

  /**
   * Filtro por disponibilidad mínima (horas semanales).
   * Solo muestra proyectos con weeklyHours >= este valor.
   */
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  disponibilidadMin?: number;

  /**
   * Filtro por roles requeridos (ids).
   * Retorna proyectos que necesiten al menos uno de los roles indicados.
   * Query param: roleIds=1&roleIds=2  (o roleIds[]=1&roleIds[]=2)
   */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(Number).filter((n) => !isNaN(n));
  })
  roleIds?: number[];

  /**
   * Filtro por áreas de interés (ids).
   * Retorna proyectos que compartan al menos una de las áreas indicadas.
   */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(Number).filter((n) => !isNaN(n));
  })
  interestAreaIds?: number[];

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
