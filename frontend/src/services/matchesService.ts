import { api } from "./api";

export interface MatchTeamDTO {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
}

export interface SetScoreDTO {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
}

export interface MatchTimelineEvent {
  id: string;
  type: "POINT" | "TIMEOUT" | "SUBSTITUTION" | "SET_END" | "MATCH_END";
  team: "A" | "B" | null;
  timestamp: string;
  setNumber: number;
  scoreA: number;
  scoreB: number;
  description?: string;
}

export interface MatchDTO {
  id: string;
  status: "PENDING" | "LIVE" | "FINISHED" | "CANCELLED" | "WALKOVER";
  tournamentName: string;
  round: string;
  teamA: MatchTeamDTO;
  teamB: MatchTeamDTO;
  scoreTeamA: number;
  scoreTeamB: number;
  currentSet: number;
  sets: SetScoreDTO[];
  winnerId: string | null;
  refereeId: string | null;
  refereeCode: string | null;
  servingTeam: "A" | "B" | null;
  format: string;
  category: string;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  timeouts: { A: number; B: number };
  cards: { A: number; B: number };
  stats?: {
    totalPoints: { A: number; B: number };
    aces: { A: number; B: number };
    errors: { A: number; B: number };
    blocks: { A: number; B: number };
  };
  nextMatch?: {
    round: string;
    opponentName: string;
    scheduledAt: string;
  };
}

export interface PointParams {
  team: "A" | "B";
}

export interface TimeoutParams {
  team?: "A" | "B";
}

export interface WalkoverParams {
  winnerTeam: "A" | "B";
}

export interface SetFinishParams {
  setNumber: number;
}

export interface SubstitutionParams {
  teamId: string;
  playerOutId?: string;
  playerInId?: string;
}

export const matchesService = {
  async refereeEnter(code: string): Promise<MatchDTO> {
    const { data } = await api.post<MatchDTO>("/matches/referee-enter", { code });
    return data;
  },

  async findRefereeMine(): Promise<MatchDTO[]> {
    const { data } = await api.get<MatchDTO[]>("/matches/referee-mine");
    return data;
  },

  async findOne(id: string): Promise<MatchDTO> {
    const { data } = await api.get<MatchDTO>(`/matches/${id}`);
    return data;
  },

  async getTimeline(id: string): Promise<MatchTimelineEvent[]> {
    const { data } = await api.get<MatchTimelineEvent[]>(`/matches/${id}/timeline`);
    return data;
  },

  async startMatch(id: string): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/start`);
    return data;
  },

  async registerPoint(id: string, params: PointParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/point`, params);
    return data;
  },

  async removePoint(id: string, params: PointParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/remove-point`, params);
    return data;
  },

  async finishSet(id: string, params: SetFinishParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/set-finish`, params);
    return data;
  },

  async finishMatch(id: string): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/finish`);
    return data;
  },

  async declareWalkover(id: string, params: WalkoverParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/walkover`, params);
    return data;
  },

  async registerTimeout(id: string, params: TimeoutParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/timeout`, params);
    return data;
  },

  async registerSubstitution(id: string, params: SubstitutionParams): Promise<MatchDTO> {
    const { data } = await api.patch<MatchDTO>(`/matches/${id}/substitution`, params);
    return data;
  },
};
