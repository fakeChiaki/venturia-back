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
import { CompanyOnlyGuard } from '../auth/guards/company-only.guard';
import { CreatorOnlyGuard } from '../auth/guards/creator-only.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { FundingService } from './funding.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@ApiTags('funding')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('funding')
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  // ─── Empresa ──────────────────────────────────────────────────────────────────

  @Post('projects/:projectId/offers')
  @UseGuards(CompanyOnlyGuard)
  @ApiOperation({ summary: 'Realizar oferta de financiamiento a un proyecto (empresa)' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  @ApiResponse({ status: 201, description: 'Oferta creada, proyecto en negociación' })
  @ApiResponse({ status: 409, description: 'El proyecto no está disponible para ofertas' })
  createOffer(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOfferDto,
  ) {
    return this.fundingService.createOffer(user.sub, projectId, dto);
  }

  @Get('projects/:projectId/my-offers')
  @UseGuards(CompanyOnlyGuard)
  @ApiOperation({ summary: 'Ver mis ofertas en un proyecto (empresa)' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  getMyOffersForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fundingService.getMyOffersForProject(user.sub, projectId);
  }

  @Get('projects/:projectId/summary')
  @ApiOperation({ summary: 'Progreso de financiamiento del proyecto (meta, recaudado, restante)' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  getFundingSummary(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.fundingService.getFundingSummary(projectId);
  }

  // ─── Creador ──────────────────────────────────────────────────────────────────

  @Get('projects/:projectId/offers')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Ver todas las ofertas recibidas en un proyecto (creador)' })
  @ApiParam({ name: 'projectId', description: 'UUID del proyecto' })
  getProjectOffers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fundingService.getProjectOffers(user.sub, projectId);
  }

  @Post('offers/:id/counter')
  @UseGuards(CreatorOnlyGuard)
  @ApiOperation({ summary: 'Contraoferta a una oferta pendiente (creador)' })
  @ApiParam({ name: 'id', description: 'UUID de la oferta a contrarrestar' })
  @ApiResponse({ status: 201, description: 'Contraoferta creada, oferta original marcada como countered' })
  @ApiResponse({ status: 409, description: 'La oferta no está pendiente' })
  counterOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOfferDto,
  ) {
    return this.fundingService.counterOffer(user.sub, id, dto);
  }

  @Patch('offers/:id/accept')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar oferta (creador) → proyecto pasa a funded' })
  @ApiParam({ name: 'id', description: 'UUID de la oferta' })
  @ApiResponse({ status: 200, description: 'Oferta aceptada, proyecto en estado funded' })
  @ApiResponse({ status: 409, description: 'La oferta no está pendiente' })
  acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fundingService.acceptOffer(user.sub, id);
  }

  @Patch('offers/:id/reject')
  @UseGuards(CreatorOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar oferta (creador)' })
  @ApiParam({ name: 'id', description: 'UUID de la oferta' })
  @ApiResponse({ status: 200, description: 'Oferta rechazada' })
  @ApiResponse({ status: 409, description: 'La oferta no está pendiente' })
  rejectOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fundingService.rejectOffer(user.sub, id);
  }
}
