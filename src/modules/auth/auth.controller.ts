import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterPersonDto } from './dto/register-person.dto';
import { SetSubtypeDto } from './dto/set-subtype.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { GoogleProfile, JwtPayload } from './interfaces/auth.interfaces';
import { User } from '../users/entities/user.entity';

const REFRESH_COOKIE = 'refresh_token';

const TOKEN_RESPONSE = {
  schema: {
    example: { accessToken: 'eyJhbGciOiJIUzI1NiJ9...' },
  },
};

@ApiTags('auth')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Registro ───────────────────────────────────────────────────────────────

  @Post('register/person')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('El CV debe ser un archivo PDF'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'password', 'confirmPassword', 'subtype', 'cv'],
      properties: {
        fullName: { type: 'string', example: 'Juan Pérez' },
        email: { type: 'string', example: 'juan@ejemplo.cl' },
        password: { type: 'string', example: 'MiClave123!' },
        confirmPassword: { type: 'string', example: 'MiClave123!' },
        subtype: { type: 'string', enum: ['creator', 'developer'], example: 'developer' },
        cv: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Registrar persona natural' })
  @ApiResponse({ status: 201, description: 'Registro exitoso. Devuelve access token; refresh token en cookie HttpOnly.', ...TOKEN_RESPONSE })
  @ApiResponse({ status: 400, description: 'El CV no es un PDF o supera 5 MB' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  async registerPerson(
    @Body() dto: RegisterPersonDto,
    @UploadedFile() cv: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!cv) throw new BadRequestException('El CV es obligatorio');
    const tokens = await this.authService.registerPerson(dto, cv.buffer);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('register/company')
  @ApiOperation({ summary: 'Registrar empresa' })
  @ApiResponse({ status: 201, description: 'Registro exitoso. Devuelve access token; refresh token en cookie HttpOnly.', ...TOKEN_RESPONSE })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  async registerCompany(
    @Body() dto: RegisterCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.registerCompany(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // ─── Login local ────────────────────────────────────────────────────────────

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso. Devuelve access token; refresh token en cookie HttpOnly.', ...TOKEN_RESPONSE })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 403, description: 'Cuenta desactivada' })
  async login(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Iniciar flujo OAuth2 con Google' })
  @ApiResponse({ status: 302, description: 'Redirige al consentimiento de Google' })
  googleAuth() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Callback OAuth2 de Google (uso interno)' })
  @ApiResponse({ status: 302, description: 'Redirige al frontend con el access token' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado con contraseña local' })
  async googleCallback(
    @CurrentUser() profile: GoogleProfile,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.handleGoogleUser(profile);
    this.setRefreshCookie(res, tokens.refreshToken);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }

  // ─── Rotación de tokens ─────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiCookieAuth('refresh-cookie')
  @ApiOperation({ summary: 'Rotar par de tokens usando el refresh token de la cookie' })
  @ApiResponse({ status: 200, description: 'Tokens rotados', ...TOKEN_RESPONSE })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cerrar sesión e invalidar el refresh token' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
    return { message: 'Sesión cerrada' };
  }

  // ─── Onboarding post-OAuth ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Patch('subtype')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Elegir subtipo (creator/developer) — paso de onboarding post-OAuth para personas naturales' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['subtype'],
      properties: {
        subtype: { type: 'string', enum: ['creator', 'developer'], example: 'creator' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Subtipo guardado. Devuelve nuevos tokens con subtype actualizado.', ...TOKEN_RESPONSE })
  @ApiResponse({ status: 403, description: 'Solo personas naturales pueden usar este endpoint' })
  async setSubtype(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetSubtypeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.setSubtype(user.sub, dto.subtype);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // ─── Perfil del token activo ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener payload del token activo' })
  @ApiResponse({
    status: 200,
    description: 'Datos del token actual',
    schema: { example: { sub: 'uuid', email: 'juan@ejemplo.cl', type: 'natural_person' } },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  // ─── Helper ─────────────────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      path: '/auth/refresh',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
