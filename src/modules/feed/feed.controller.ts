import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import type { FeedResult } from './feed.service';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';

@ApiTags('feed')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Feed de proyectos. Empresas ven open/negotiating; developers ven seeking_team. Override con ?status=...' })
  getFeed(@Query() query: FeedQueryDto, @CurrentUser() user: JwtPayload): Promise<FeedResult> {
    return this.feedService.getFeed(query, user);
  }
}
