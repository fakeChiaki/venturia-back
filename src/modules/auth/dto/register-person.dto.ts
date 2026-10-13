import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';
import { Match } from '../../../common/validators/match.decorator';

export class RegisterPersonDto {
  @ApiProperty({ example: 'Juan Pérez', minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 'juan@ejemplo.cl' })
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

  @ApiProperty({ enum: NaturalPersonSubtype, example: NaturalPersonSubtype.DEVELOPER })
  @IsEnum(NaturalPersonSubtype)
  subtype: NaturalPersonSubtype;
}
