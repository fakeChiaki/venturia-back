import { IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RoleRequirementItemDto {
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

// RF-14: reemplaza todos los requerimientos de roles del proyecto en una sola llamada
export class SetRoleRequirementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleRequirementItemDto)
  requirements!: RoleRequirementItemDto[];
}
