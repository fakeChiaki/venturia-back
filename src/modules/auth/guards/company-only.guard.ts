import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserType } from '../../users/entities/user.entity';
import type { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class CompanyOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtPayload;
    if (user?.type !== UserType.COMPANY) {
      throw new ForbiddenException('Este endpoint es exclusivo para empresas');
    }
    return true;
  }
}
