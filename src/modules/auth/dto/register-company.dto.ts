import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Match } from '../../../common/validators/match.decorator';

class CompanyOwnerDto {
  @ApiProperty({ example: 'María González', minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '12345678-9', description: 'RUT chileno sin puntos, con guión' })
  @IsString()
  @MinLength(5)
  @MaxLength(12)
  rut: string;

  @ApiPropertyOptional({ example: 'maria@empresa.cl' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+56912345678', maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;
}

export class RegisterCompanyDto {
  @ApiProperty({ example: 'contacto@empresa.cl' })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @ApiProperty({ example: 'MiClave123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ example: 'MiClave123!' })
  @IsString()
  @Match('password', { message: 'Las contraseñas no coinciden' })
  confirmPassword: string;

  @ApiProperty({ example: 'Empresa SpA', minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  companyName: string;

  @ApiProperty({ example: 'Av. Providencia 1234, Santiago', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: '+56222345678', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiPropertyOptional({
    example: { mon: { from: '09:00', to: '18:00' }, fri: { from: '09:00', to: '17:00' } },
    description: 'Horario de atención por día',
  })
  @IsOptional()
  businessHours?: Record<string, { from: string; to: string }>;

  @ApiPropertyOptional({ example: 'Trabajo 100% remoto, reuniones semanales los lunes.' })
  @IsString()
  @IsOptional()
  policies?: string;

  @ApiPropertyOptional({ type: [CompanyOwnerDto] })
  @ValidateNested({ each: true })
  @Type(() => CompanyOwnerDto)
  @IsOptional()
  owners?: CompanyOwnerDto[];
}
