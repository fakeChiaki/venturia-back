import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import authConfig from '../../../config/auth.config';
import { AuthService } from '../auth.service';
import type { JwtRefreshPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(authConfig.KEY)
    config: ConfigType<typeof authConfig>,
    private readonly authService: AuthService,
  ) {
    // passReqToCallback:true cambia la firma de validate a (req, payload).
    // El cast a `any` evita el conflicto de overloads en @types/passport-jwt.
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies as Record<string, string> | undefined)?.[
            'refresh_token'
          ] ?? null,
      ]),
      secretOrKey: config.jwtRefreshSecret!,
      passReqToCallback: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      'refresh_token'
    ];
    if (!token) throw new UnauthorizedException();
    // Valida que el token coincida con el hash almacenado → previene reúso
    return this.authService.validateRefreshToken(payload.sub, token);
  }
}
