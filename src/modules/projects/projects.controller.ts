import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreatorOnlyGuard } from '../auth/guards/creator-only.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { SetRoleRequirementsDto } from './dto/set-role-requirements.dto';
import { AddProjectMediaDto } from './dto/add-project-media.dto';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Crear un nuevo proyecto (creador)' })
  @ApiResponse({ status: 201, description: 'Proyecto creado en estado borrador' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtPayload) {
    return this.projectsService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Listar proyectos del creador autenticado' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.projectsService.findAllByCreator(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un proyecto' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Actualizar datos del proyecto (creador)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.sub, dto);
  }

  @Patch(':id/publish')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publicar proyecto (draft → open) y encolar afinidad' })
  @ApiResponse({ status: 200, description: 'Proyecto abierto para financiamiento' })
  @ApiResponse({ status: 409, description: 'El proyecto no está en estado borrador' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.publish(id, user.sub);
  }

  @Patch(':id/visibility')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Actualizar visibilidad de campos del proyecto' })
  updateVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.projectsService.updateVisibility(id, user.sub, dto);
  }

  @Patch(':id/status')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Cambiar estado del proyecto con validación de transiciones' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { status: string },
  ) {
    return this.projectsService.updateStatus(id, user.sub, body as any);
  }

  @Patch(':id/roles')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Definir roles requeridos del proyecto (solo en Draft)' })
  setRoleRequirements(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetRoleRequirementsDto,
  ) {
    return this.projectsService.setRoleRequirements(id, user.sub, dto);
  }

  @Get(':id/vacancies')
  @ApiOperation({ summary: 'Total de vacantes del proyecto' })
  getVacanciesCount(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getTeamCount(id);
  }

  @Post(':id/media')
  @UseGuards(CreatorOnlyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'name', 'file'],
      properties: {
        type: { type: 'string', enum: ['image', 'video', 'document'] },
        name: { type: 'string', example: 'Demo del proyecto' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Agregar imagen, video o documento al proyecto' })
  @ApiResponse({ status: 201, description: 'Archivo subido a MinIO y registrado' })
  addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddProjectMediaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('El archivo es obligatorio');
    return this.projectsService.addMedia(id, user.sub, dto.type, dto.name, file.buffer, file.mimetype);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar multimedia del proyecto' })
  removeMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.removeMedia(id, mediaId, user.sub);
  }

  @Delete(':id')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proyecto (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.remove(id, user.sub);
  }
}
