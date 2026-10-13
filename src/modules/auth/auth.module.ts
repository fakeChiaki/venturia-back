import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import authConfig from '../../config/auth.config';
import { CompanyOwner } from '../companies/entities/company-owner.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (config: ConfigType<typeof authConfig>): any => ({
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessExpiration },
      }),
    }),
    // Registramos directamente las entidades que necesita AuthService.
    // No importamos los feature-modules para evitar dependencias circulares.
    TypeOrmModule.forFeature([
      User,
      NaturalPersonProfile,
      CompanyProfile,
      CompanyOwner,
    ]),
    NotificationsModule,
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    JwtRefreshGuard,
    GoogleAuthGuard,
  ],
  // JwtAuthGuard y AuthService son usados por otros módulos para proteger rutas
  exports: [JwtAuthGuard, JwtStrategy, AuthService],
})
export class AuthModule {}
