import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PersonOnlyGuard } from '../auth/guards/person-only.guard';
import { CompanyOnlyGuard } from '../auth/guards/company-only.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { UpdateNaturalProfileDto } from './dto/update-natural-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Obtener perfil autenticado (natural o empresa)' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me/profile/natural')
  @UseGuards(PersonOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Editar perfil de persona natural' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  updateNaturalProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNaturalProfileDto,
  ) {
    return this.usersService.updateNaturalProfile(user.sub, dto);
  }

  @Patch('me/profile/company')
  @UseGuards(CompanyOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Editar perfil de empresa' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  updateCompanyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    return this.usersService.updateCompanyProfile(user.sub, dto);
  }

  @Patch('me/onboarding')
  @UseGuards(PersonOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar/actualizar onboarding técnico y encolar afinidad' })
  @ApiResponse({ status: 200, description: 'Onboarding actualizado' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  completeOnboarding(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.usersService.completeOnboarding(user.sub, dto);
  }

  @Post('me/cv')
  @UseGuards(PersonOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Solo se permiten archivos PDF'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Subir o reemplazar el CV en PDF' })
  @ApiResponse({ status: 200, description: 'CV actualizado. Devuelve el perfil con cvUrl actualizada.' })
  @ApiResponse({ status: 400, description: 'El archivo no es un PDF o supera 5 MB' })
  uploadCv(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.usersService.uploadCv(user.sub, file.buffer);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar cuenta de usuario' })
  @ApiResponse({ status: 204, description: 'Usuario desactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@CurrentUser() user: JwtPayload) {
    await this.usersService.deactivateUser(user.sub);
  }
}