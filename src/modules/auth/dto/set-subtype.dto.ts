import { IsEnum } from 'class-validator';
import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';

export class SetSubtypeDto {
  @IsEnum(NaturalPersonSubtype)
  subtype: NaturalPersonSubtype;
}
