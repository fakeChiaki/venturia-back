import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import authConfig from '../../config/auth.config';
import { CompanyOwner } from '../companies/entities/company-owner.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { NaturalPersonProfile, NaturalPersonSubtype } from '../users/entities/natural-person-profile.entity';
import {
  AuthProvider,
  User,
  UserType,
} from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterPersonDto } from './dto/register-person.dto';
import {
  GoogleProfile,
  JwtPayload,
  TokensResponse,
} from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  // ─── Validación (usada por LocalStrategy) ────────────────────────────────────

  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { email },
      // select explícito para traer campos con select:false
      select: ['id', 'email', 'passwordHash', 'type', 'isActive', 'provider'],
    });

    if (!user || !user.passwordHash) return null;
    if (!user.isActive) throw new ForbiddenException('Cuenta desactivada');

    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async validateRefreshToken(userId: string, token: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'type', 'isActive', 'refreshTokenHash'],
    });

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException();

    return user;
  }

  // ─── Registro ─────────────────────────────────────────────────────────────────

  async registerPerson(dto: RegisterPersonDto, cvBuffer: Buffer): Promise<TokensResponse> {
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let createdUserId!: string;
    const tokens = await this.dataSource.transaction(async (em) => {
      const user = em.create(User, {
        email: dto.email,
        passwordHash,
        type: UserType.NATURAL_PERSON,
        provider: AuthProvider.LOCAL,
      });
      await em.save(user);
      createdUserId = user.id;

      await em.save(
        em.create(NaturalPersonProfile, {
          userId: user.id,
          fullName: dto.fullName,
          subtype: dto.subtype,
        }),
      );

      return this.issueTokens(user, em);
    });

    const cvUrl = await this.storageService.upload(`cvs/${createdUserId}.pdf`, cvBuffer, 'application/pdf');
    await this.dataSource.getRepository(NaturalPersonProfile).update({ userId: createdUserId }, { cvUrl });

    await this.notificationsService.notifyAccountCreated(createdUserId, dto.fullName, dto.email);
    return tokens;
  }

  async registerCompany(dto: RegisterCompanyDto): Promise<TokensResponse> {
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let createdUserId!: string;
    const tokens = await this.dataSource.transaction(async (em) => {
      const user = em.create(User, {
        email: dto.email,
        passwordHash,
        type: UserType.COMPANY,
        provider: AuthProvider.LOCAL,
      });
      await em.save(user);
      createdUserId = user.id;

      const company = em.create(CompanyProfile, {
        userId: user.id,
        companyName: dto.companyName,
        address: dto.address,
        phone: dto.phone,
        businessHours: dto.businessHours ?? null,
        policies: dto.policies ?? null,
      });
      await em.save(company);

      if (dto.owners?.length) {
        const owners = dto.owners.map((o) =>
          em.create(CompanyOwner, { ...o, companyProfileId: company.id }),
        );
        await em.save(owners);
      }

      return this.issueTokens(user, em);
    });

    await this.notificationsService.notifyAccountCreated(createdUserId, dto.companyName, dto.email);
    return tokens;
  }

  // ─── Login / OAuth ────────────────────────────────────────────────────────────

  async login(user: User): Promise<TokensResponse> {
    return this.dataSource.transaction((em) => this.issueTokens(user, em));
  }

  async handleGoogleUser(profile: GoogleProfile): Promise<TokensResponse> {
    let isNewUser = false;
    let newUserId!: string;
    let newUserEmail!: string;
    let newUserName!: string;

    const tokens = await this.dataSource.transaction(async (em) => {
      // 1. Buscar por googleId
      let user = await em.findOne(User, { where: { googleId: profile.googleId } });

      if (!user) {
        // 2. Buscar por email
        user = await em.findOne(User, { where: { email: profile.email } });

        if (user) {
          // Email registrado con contraseña — no mezclar proveedores
          if (user.provider === AuthProvider.LOCAL) {
            throw new ConflictException(
              'Este correo ya está registrado con contraseña. Inicia sesión con tu contraseña.',
            );
          }
          user.googleId = profile.googleId;
          await em.save(user);
        } else {
          // 3. Crear usuario nuevo
          user = em.create(User, {
            email: profile.email,
            type: UserType.NATURAL_PERSON,
            provider: AuthProvider.GOOGLE,
            googleId: profile.googleId,
            emailVerified: true,
          });
          await em.save(user);

          const fullName = `${profile.firstName} ${profile.lastName}`.trim();
          await em.save(
            em.create(NaturalPersonProfile, {
              userId: user.id,
              fullName,
              photoUrl: profile.photoUrl,
            }),
          );

          isNewUser = true;
          newUserId = user.id;
          newUserEmail = profile.email;
          newUserName = fullName;
        }
      }

      if (!user.isActive) throw new ForbiddenException('Cuenta desactivada');

      return this.issueTokens(user, em);
    });

    if (isNewUser) {
      await this.notificationsService.notifyAccountCreated(newUserId, newUserName, newUserEmail);
    }

    return tokens;
  }

  // ─── Onboarding post-OAuth ────────────────────────────────────────────────────

  async setSubtype(userId: string, subtype: NaturalPersonSubtype): Promise<TokensResponse> {
    return this.dataSource.transaction(async (em) => {
      const result = await em.update(NaturalPersonProfile, { userId }, { subtype });
      if (!result.affected) {
        throw new ForbiddenException('Solo personas naturales pueden asignar un subtipo');
      }
      const user = await em.findOneOrFail(User, { where: { id: userId } });
      return this.issueTokens(user, em);
    });
  }

  // ─── Rotación de tokens ───────────────────────────────────────────────────────

  async refreshTokens(user: User): Promise<TokensResponse> {
    return this.dataSource.transaction((em) => this.issueTokens(user, em));
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshTokenHash: null });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private async assertEmailFree(email: string): Promise<void> {
    const exists = await this.userRepo.existsBy({ email });
    if (exists) throw new ConflictException('El correo ya está registrado');
  }

  /**
   * Genera access + refresh token, almacena el hash del refresh en BD
   * y devuelve ambos tokens. Siempre se llama dentro de una transacción
   * para garantizar que el hash se persiste junto con el registro del usuario.
   */
  private async issueTokens(
    user: User,
    em: EntityManager,
  ): Promise<TokensResponse> {
    let subtype: NaturalPersonSubtype | null = null;
    if (user.type === UserType.NATURAL_PERSON) {
      const profile = await em.findOne(NaturalPersonProfile, {
        where: { userId: user.id },
        select: ['subtype'],
      });
      subtype = profile?.subtype ?? null;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: user.type,
      provider: user.provider,
      subtype,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.jwtAccessSecret,
      // StringValue es un tipo branded de ms; el cast permite pasar strings
      // válidos de entorno sin perder la validación de Joi al arrancar.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.config.jwtAccessExpiration as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.jwtRefreshSecret,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: this.config.jwtRefreshExpiration as any,
      },
    );

    // Costo 10 es suficiente: el refresh token ya es criptográficamente aleatorio.
    // El costo alto (12) se reserva para hashes de contraseñas.
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await em.update(User, user.id, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
