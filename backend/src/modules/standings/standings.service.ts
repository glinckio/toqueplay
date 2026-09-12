import { Injectable, Logger } from '@nestjs/common';
import { BracketType, TournamentEventType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import {
  buildStandings,
  placementForEliminationLoss,
  pointsForPlacement,
  DEFAULT_POINTS_RULES,
  MatchForStandings,
} from './standings.logic';

const MATCH_SELECT = {
  teamAId: true,
  teamBId: true,
  winnerId: true,
  scoreTeamA: true,
  scoreTeamB: true,
  round: true,
  group: true,
  status: true,
  sets: { select: { scoreA: true, scoreB: true } },
} as const;

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  constructor(private prisma: PrismaService) {}

  /** Semeia a sugestao de pontuacao. O organizador edita depois; so roda se ainda nao houver. */
  async seedDefaultPointsRules(tournamentId: string) {
    const existentes = await this.prisma.tournamentPointsRule.count({ where: { tournamentId } });
    if (existentes > 0) return;

    await this.prisma.tournamentPointsRule.createMany({
      data: DEFAULT_POINTS_RULES.map((r) => ({ tournamentId, ...r })),
    });
  }

  async getPointsRules(tournamentId: string) {
    return this.prisma.tournamentPointsRule.findMany({
      where: { tournamentId },
      orderBy: { placement: 'asc' },
    });
  }

  /** Substitui a tabela inteira: e mais previsivel que casar linha a linha com o que veio. */
  async replacePointsRules(tournamentId: string, rules: { placement: number; points: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.tournamentPointsRule.deleteMany({ where: { tournamentId } });
      if (rules.length > 0) {
        await tx.tournamentPointsRule.createMany({
          data: rules.map((r) => ({ tournamentId, ...r })),
        });
      }
      return tx.tournamentPointsRule.findMany({
        where: { tournamentId },
        orderBy: { placement: 'asc' },
      });
    });
  }

  /**
   * Classificacao de um grupo (ou do round robin inteiro, que e o grupo unico).
   * E a tabela que decide quem avanca na liga.
   */
  async getGroupStandings(bracketId: string) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { id: bracketId },
      include: {
        category: { select: { bestOfSets: true } },
        matches: { select: MATCH_SELECT },
      },
    });
    if (!bracket) throw AppError.bracketNotFound();

    const bestOfSets = bracket.category?.bestOfSets ?? 3;
    const porGrupo = new Map<number, typeof bracket.matches>();
    for (const m of bracket.matches) {
      // Partida sem grupo e mata-mata: nao entra em tabela de classificacao.
      if (m.group === null || m.group === undefined) continue;
      const lista = porGrupo.get(m.group) ?? [];
      lista.push(m);
      porGrupo.set(m.group, lista);
    }

    return [...porGrupo.entries()]
      .sort(([a], [b]) => a - b)
      .map(([group, matches]) => ({
        group,
        rows: buildStandings(this.teamIdsOf(matches), matches as MatchForStandings[], bestOfSets),
      }));
  }

  /**
   * Calcula e grava a colocacao de cada time numa etapa, a partir das partidas ja decididas.
   *
   * Roda a cada partida encerrada, nao so no fim: num mata-mata quem perde ja tem colocacao
   * definitiva na hora (quem cai nas quartas e 5o e isso nao muda mais). Time ainda vivo fica
   * sem linha ate ser eliminado ou campeao — e o unico jeito honesto de mostrar parcial.
   *
   * Round robin da ordem completa (1..N). Chaveamento eliminatorio nao: quem cai na mesma fase
   * divide a colocacao, e por isso nao existe 4o nem 6o num mata-mata de 8.
   */
  async computeStagePlacements(stageId: string, categoryId: string) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { categoryId_stageId: { categoryId, stageId } },
      include: {
        category: { select: { bestOfSets: true } },
        matches: { select: MATCH_SELECT },
        stage: { select: { tournamentId: true } },
      },
    });
    if (!bracket) throw AppError.bracketNotFound();

    const bestOfSets = bracket.category?.bestOfSets ?? 3;
    const tournamentId = bracket.stage.tournamentId;
    const rules = await this.getPointsRules(tournamentId);

    const posicoes =
      bracket.type === BracketType.ROUND_ROBIN
        ? this.placementsFromRoundRobin(bracket.matches, bestOfSets)
        : this.placementsFromElimination(bracket.matches);

    const linhas = [...posicoes.entries()].map(([teamId, position]) => ({
      tournamentId,
      stageId,
      categoryId,
      teamId,
      position,
      points: pointsForPlacement(rules, position),
    }));

    await this.prisma.$transaction(async (tx) => {
      // Recalcular e idempotente: apaga o que havia e regrava.
      await tx.stagePlacement.deleteMany({ where: { stageId, categoryId } });
      if (linhas.length > 0) await tx.stagePlacement.createMany({ data: linhas });
    });

    this.logger.log(`placements stage=${stageId} category=${categoryId} teams=${linhas.length}`);
    return linhas.sort((a, b) => a.position - b.position);
  }

  /**
   * Tabela acumulada do torneio, por categoria.
   *
   * Quem nao jogou uma etapa simplesmente nao tem linha nela — some da soma, sem zero artificial.
   */
  async getTournamentStandings(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
      include: {
        categories: { select: { id: true, type: true, format: true, modality: true } },
        stages: { select: { id: true, name: true, date: true }, orderBy: { date: 'asc' } },
      },
    });
    if (!tournament) throw AppError.tournamentNotFound();

    const placements = await this.prisma.stagePlacement.findMany({
      where: { tournamentId },
      include: { team: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return {
      stages: tournament.stages,
      categories: tournament.categories.map((category) => {
        const daCategoria = placements.filter((p) => p.categoryId === category.id);
        const porTime = new Map<string, { team: (typeof daCategoria)[number]['team']; byStage: Record<string, { position: number; points: number }>; total: number }>();

        for (const p of daCategoria) {
          const atual = porTime.get(p.teamId) ?? { team: p.team, byStage: {}, total: 0 };
          atual.byStage[p.stageId] = { position: p.position, points: p.points };
          atual.total += p.points;
          porTime.set(p.teamId, atual);
        }

        return {
          category,
          rows: [...porTime.values()].sort((a, b) => b.total - a.total),
        };
      }),
    };
  }

  private teamIdsOf(matches: { teamAId: string | null; teamBId: string | null }[]): string[] {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.teamAId) ids.add(m.teamAId);
      if (m.teamBId) ids.add(m.teamBId);
    }
    return [...ids];
  }

  private placementsFromRoundRobin(
    matches: MatchForStandings[],
    bestOfSets: number,
  ): Map<string, number> {
    const tabela = buildStandings(this.teamIdsOf(matches), matches, bestOfSets);
    return new Map(tabela.map((row, i) => [row.teamId, i + 1]));
  }

  private placementsFromElimination(
    matches: (MatchForStandings & { round: number })[],
  ): Map<string, number> {
    const posicoes = new Map<string, number>();
    const totalRounds = Math.max(...matches.map((m) => m.round), 1);

    for (const m of matches) {
      if (!m.winnerId) continue;
      const perdedorId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
      if (perdedorId) {
        posicoes.set(perdedorId, placementForEliminationLoss(m.round, totalRounds));
      }
      // O campeao e quem venceu a ultima rodada.
      if (m.round === totalRounds) posicoes.set(m.winnerId, 1);
    }

    return posicoes;
  }

  /**
   * Times que disputam a etapa final do circuito: os `finalStageTeamCount` melhores da tabela
   * acumulada, por categoria.
   *
   * Devolve em vez de inscrever: quem monta a chave e o BracketsService, e manter a decisao de
   * "quem entra" separada de "como joga" evita que uma mudanca na tabela reescreva chave pronta.
   */
  async getFinalStageQualifiers(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, deletedAt: null },
      select: { id: true, eventType: true, finalStageTeamCount: true },
    });
    if (!tournament) throw AppError.tournamentNotFound();
    if (tournament.eventType !== TournamentEventType.CIRCUIT) {
      throw AppError.bracketTypeNotAllowed();
    }
    if (!tournament.finalStageTeamCount || tournament.finalStageTeamCount < 2) {
      throw AppError.invalidTeamCount();
    }

    const standings = await this.getTournamentStandings(tournamentId);

    return standings.categories.map(({ category, rows }) => ({
      category,
      qualifiers: rows.slice(0, tournament.finalStageTeamCount!).map((row, i) => ({
        seed: i + 1,
        teamId: row.team.id,
        teamName: row.team.name,
        points: row.total,
      })),
    }));
  }
}
