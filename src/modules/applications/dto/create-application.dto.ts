import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ description: 'UUID del proyecto al que se postula' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'ID del rol al que aplica el postulante' })
  @IsInt()
  @IsPositive()
  roleId: number;

  @ApiPropertyOptional({ description: 'Mensaje del postulante a la empresa', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
