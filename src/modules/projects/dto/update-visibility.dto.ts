import { IsObject } from 'class-validator';
import type { FieldVisibility } from '../entities/project.entity';

// RF-13: endpoint dedicado para que la empresa ajuste la visibilidad pública de cada campo
export class UpdateVisibilityDto {
  @IsObject()
  fieldVisibility!: FieldVisibility;
}
