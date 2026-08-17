import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RankingService } from './ranking.service';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get(':id/ranking')
  @ApiOperation({ summary: 'Ranking acumulado do torneio/circuito' })
  @ApiResponse({ status: 200, description: 'Ranking retornado' })
  async getRanking(@Param('id') tournamentId: string) {
    return this.rankingService.getRanking(tournamentId);
  }
}
