import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatorOnlyGuard } from '../auth/guards/creator-only.guard';
import { DeveloperOnlyGuard } from '../auth/guards/developer-only.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@ApiTags('applications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // ─── Persona natural ─────────────────────────────────────────────────────────

  @Post()
  @UseGuards(DeveloperOnlyGuard)
  @ApiOperation({ summary: 'Postular a un proyecto (persona natural)' })
  @ApiResponse({ status: 201, description: 'Postulación creada' })
  @ApiResponse({ status: 403, description: 'Solo personas naturales pueden postular' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  @ApiResponse({ status: 409, description: 'Postulación duplicada, cupo lleno o rol inválido' })
  apply(@CurrentUser() user: JwtPayload, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.apply(user.sub, dto);
  }

  // Ruta fija antes del parámetro /:id para evitar conflicto de rutas
  @Get('mine')
  @UseGuards(DeveloperOnlyGuard)
  @ApiOperation({ summary: 'Mis postulaciones (persona natural)' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones del usuario' })
  getMyApplications(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.getMyApplications(user.sub);
  }

  // ─── Creador ──────────────────────────────────────────────────────────────────

  @Get('project/:projectId')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Postulaciones de un proyecto (creador del proyecto)' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones' })
  @ApiResponse({ status: 403, description: 'Sin acceso al proyecto' })
  getProjectApplications(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.applicationsService.getProjectApplications(user.sub, projectId);
  }

  @Get('project/:projectId/team')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Equipo actual de un proyecto' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  @ApiResponse({ status: 200, description: 'Miembros del equipo' })
  @ApiResponse({ status: 403, description: 'Sin acceso al proyecto' })
  getProjectTeam(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.applicationsService.getProjectTeam(user.sub, projectId);
  }

  @Patch(':id/review')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar postulación en revisión (creador)' })
  @ApiParam({ name: 'id', description: 'UUID de la postulación' })
  @ApiResponse({ status: 200, description: 'Estado actualizado a in_review' })
  @ApiResponse({ status: 409, description: 'La postulación no está pendiente' })
  markInReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicationsService.markInReview(id, user.sub);
  }

  @Patch(':id/accept')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar postulación (creador)' })
  @ApiParam({ name: 'id', description: 'UUID de la postulación' })
  @ApiResponse({
    status: 200,
    description: 'Postulación aceptada. teamComplete indica si el equipo quedó completo.',
    schema: { example: { teamComplete: false } },
  })
  @ApiResponse({ status: 409, description: 'Cupo lleno, postulación ya procesada, o proyecto no disponible' })
  accept(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicationsService.accept(id, user.sub);
  }

  @Patch(':id/reject')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar postulación (creador)' })
  @ApiParam({ name: 'id', description: 'UUID de la postulación' })
  @ApiResponse({ status: 200, description: 'Postulación rechazada' })
  @ApiResponse({ status: 409, description: 'La postulación ya fue procesada' })
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicationsService.reject(id, user.sub);
  }
}
