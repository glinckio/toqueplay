import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StandingsService } from './standings.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { UpdatePointsRulesDto } from './dto/update-points-rules.dto';

@ApiTags('Standings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class StandingsController {
  constructor(
    private readonly standingsService: StandingsService,
    private readonly tournamentsService: TournamentsService,
  ) {}

  @Public()
  @Get(':id/standings')
  @ApiOperation({ summary: 'Tabela acumulada do torneio, por categoria' })
  @ApiResponse({ status: 200, description: 'Classificacao acumulada' })
  async getStandings(@Param('id') tournamentId: string) {
    return this.standingsService.getTournamentStandings(tournamentId);
  }

  @Public()
  @Get(':id/group-standings')
  @ApiOperation({ summary: 'Classificacao de grupo, com os desempates da CBV' })
  @ApiQuery({ name: 'bracketId', required: true })
  async getGroupStandings(@Query('bracketId') bracketId: string) {
    return this.standingsService.getGroupStandings(bracketId);
  }

  @Public()
  @Get(':id/points-rules')
  @ApiOperation({ summary: 'Tabela de pontos por colocacao' })
  async getPointsRules(@Param('id') tournamentId: string) {
    return this.standingsService.getPointsRules(tournamentId);
  }

  @Put(':id/points-rules')
  @ApiOperation({ summary: 'Substituir a tabela de pontos (somente organizador)' })
  async updatePointsRules(
    @Param('id') tournamentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePointsRulesDto,
  ) {
    await this.tournamentsService.verifyOwnership(tournamentId, userId);
    return this.standingsService.replacePointsRules(tournamentId, dto.rules);
  }

  @Post(':id/stages/:stageId/categories/:categoryId/placements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular a colocacao da etapa a partir da chave encerrada' })
  async computePlacements(
    @Param('id') tournamentId: string,
    @Param('stageId') stageId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.tournamentsService.verifyOwnership(tournamentId, userId);
    return this.standingsService.computeStagePlacements(stageId, categoryId);
  }

  @Public()
  @Get(':id/final-stage-qualifiers')
  @ApiOperation({ summary: 'Times classificados para a etapa final do circuito' })
  async getFinalStageQualifiers(@Param('id') tournamentId: string) {
    return this.standingsService.getFinalStageQualifiers(tournamentId);
  }
}
