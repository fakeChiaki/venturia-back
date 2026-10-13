import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogsService } from './catalogs.service';

@ApiTags('catalogs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('technical-areas')
  @ApiOperation({ summary: 'Listar áreas técnicas disponibles' })
  findAllTechnicalAreas() {
    return this.catalogsService.findAllTechnicalAreas();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar roles disponibles' })
  findAllRoles() {
    return this.catalogsService.findAllRoles();
  }

  @Get('interest-areas')
  @ApiOperation({ summary: 'Listar áreas de interés disponibles' })
  findAllInterestAreas() {
    return this.catalogsService.findAllInterestAreas();
  }
}
