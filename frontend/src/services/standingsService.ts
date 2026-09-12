import { api } from "./api";

export interface StandingTeam {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface StandingRow {
  team: StandingTeam;
  /** Colocação e pontos por etapa. Etapa não disputada simplesmente não aparece aqui. */
  byStage: Record<string, { position: number; points: number }>;
  total: number;
}

export interface StandingsStage {
  id: string;
  name: string | null;
  date: string;
}

export interface TournamentStandings {
  stages: StandingsStage[];
  categories: {
    category: { id: string; type: string; format: string; modality: string };
    rows: StandingRow[];
  }[];
}

/** Linha da tabela de grupo: pontos vêm do placar da partida (3/2/1/0), não da colocação. */
export interface GroupStandingRow {
  teamId: string;
  /** Nulo se o time foi removido; a tela cai para o id nesse caso. */
  team: StandingTeam | null;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  leaguePoints: number;
  setAverage: number;
  pointAverage: number;
}

export interface PointsRule {
  id?: string;
  placement: number;
  points: number;
}

export const standingsService = {
  async getStandings(tournamentId: string): Promise<TournamentStandings> {
    const { data } = await api.get<TournamentStandings>(`/tournaments/${tournamentId}/standings`);
    return data;
  },

  async getGroupStandings(
    tournamentId: string,
    bracketId: string,
  ): Promise<{ group: number; rows: GroupStandingRow[] }[]> {
    const { data } = await api.get(`/tournaments/${tournamentId}/group-standings`, {
      params: { bracketId },
    });
    return data;
  },

  async getPointsRules(tournamentId: string): Promise<PointsRule[]> {
    const { data } = await api.get<PointsRule[]>(`/tournaments/${tournamentId}/points-rules`);
    return data;
  },

  async updatePointsRules(tournamentId: string, rules: PointsRule[]): Promise<PointsRule[]> {
    const { data } = await api.put<PointsRule[]>(`/tournaments/${tournamentId}/points-rules`, {
      rules: rules.map(({ placement, points }) => ({ placement, points })),
    });
    return data;
  },

  async getFinalStageQualifiers(tournamentId: string) {
    const { data } = await api.get(`/tournaments/${tournamentId}/final-stage-qualifiers`);
    return data;
  },
};
