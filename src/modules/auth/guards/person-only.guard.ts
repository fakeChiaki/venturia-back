import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserType } from '../../users/entities/user.entity';
import type { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class PersonOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (user?.type !== UserType.NATURAL_PERSON) {
      throw new ForbiddenException('Este endpoint es exclusivo para personas naturales');
    }
    return true;
  }
}
