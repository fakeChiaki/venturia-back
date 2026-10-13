import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';
import type { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class CreatorOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (user?.subtype !== NaturalPersonSubtype.CREATOR) {
      throw new ForbiddenException('Este endpoint es exclusivo para creadores de proyecto');
    }
    return true;
  }
}
