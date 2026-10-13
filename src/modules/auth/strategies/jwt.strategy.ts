import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import authConfig from '../../../config/auth.config';
import type { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(authConfig.KEY)
    config: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Joi valida que JWT_ACCESS_SECRET esté definido al arrancar
      secretOrKey: config.jwtAccessSecret!,
    });
  }

  // El payload ya fue verificado criptográficamente por passport-jwt.
  // Lo reexpedimos como req.user sin round-trip a la BD (stateless).
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
