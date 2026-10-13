import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PersonOnlyGuard } from '../auth/guards/person-only.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { AffinityQueueService } from './affinity-queue.service';

@ApiTags('affinity')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PersonOnlyGuard)
@Controller('affinity')
export class AffinityController {
  constructor(private readonly affinityQueue: AffinityQueueService) {}

  @Post('compute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Encolar recálculo de afinidad del usuario actual' })
  @ApiResponse({ status: 202, description: 'Cálculo encolado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async compute(@CurrentUser() user: JwtPayload) {
    await this.affinityQueue.enqueueForUser(user.sub);
    return { message: 'Cálculo de afinidad encolado' };
  }
}
