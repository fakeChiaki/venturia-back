import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';
import type { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class DeveloperOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (user?.subtype !== NaturalPersonSubtype.DEVELOPER) {
      throw new ForbiddenException('Este endpoint es exclusivo para desarrolladores');
    }
    return true;
  }
}
