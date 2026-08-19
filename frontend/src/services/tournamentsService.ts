import { api } from "./api";
import { TournamentStatus, TournamentFormat, TournamentModality, TournamentType, TournamentEventType, BracketType } from "@/types/enums";

export interface TournamentDTO {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  status: TournamentStatus;
  type: TournamentType;
  modality: TournamentModality;
  eventType: TournamentEventType;
  date: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  maxTeams: number | null;
  entryFee: number | null;
  prizePot: number | null;
  rules: string | null;
  organizerId: string;
  organizer: { id: string; name: string; avatarUrl: string | null };
  categories: TournamentCategoryDTO[];
  _count?: { registrations: number };
  createdAt: string;
  updatedAt: string;
}

export interface TournamentCategoryDTO {
  id: string;
  name: string;
  format: TournamentFormat;
  type: TournamentType;
  bracketType: BracketType;
  maxTeams: number | null;
  minPlayers: number;
  maxPlayers: number;
}

export interface CreateTournamentParams {
  name: string;
  description?: string;
  type?: TournamentType;
  modality?: TournamentModality;
  eventType?: TournamentEventType;
  date?: string;
  endDate?: string;
  registrationDeadline?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  maxTeams?: number;
  entryFee?: number;
  prizePot?: number;
  rules?: string;
}

export interface ExploreQueryParams {
  search?: string;
  modality?: string;
  format?: string;
  city?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface BracketMatchDTO {
  id: string;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: string;
}

export const tournamentsService = {
  async create(params: CreateTournamentParams): Promise<TournamentDTO> {
    const { data } = await api.post<TournamentDTO>("/tournaments", params);
    return data;
  },

  async update(id: string, params: Partial<CreateTournamentParams>): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}`, params);
    return data;
  },

  async findOne(id: string): Promise<TournamentDTO> {
    const { data } = await api.get<TournamentDTO>(`/tournaments/${id}`);
    return data;
  },

  async findOnePublic(id: string): Promise<TournamentDTO> {
    const { data } = await api.get<TournamentDTO>(`/tournaments/${id}/public`);
    return data;
  },

  async explore(params?: ExploreQueryParams): Promise<{ data: TournamentDTO[]; total: number }> {
    const { data } = await api.get<{ data: TournamentDTO[]; total: number }>("/tournaments/explore", { params });
    return data;
  },

  async findMine(): Promise<TournamentDTO[]> {
    const { data } = await api.get<TournamentDTO[]>("/tournaments/mine");
    return data;
  },

  async list(params?: ExploreQueryParams): Promise<{ data: TournamentDTO[]; total: number }> {
    const { data } = await api.get<{ data: TournamentDTO[]; total: number }>("/tournaments", { params });
    return data;
  },

  async visitorNearby(latitude: number, longitude: number, radius?: number): Promise<TournamentDTO[]> {
    const { data } = await api.get<TournamentDTO[]>("/tournaments/visitor-nearby", {
      params: { latitude, longitude, radius },
    });
    return data;
  },

  async publish(id: string): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}/publish`);
    return data;
  },

  async saveDraft(id: string): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}/draft`);
    return data;
  },

  async start(id: string): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}/start`);
    return data;
  },

  async complete(id: string): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}/complete`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/tournaments/${id}`);
  },

  async updateStructure(id: string, params: any): Promise<TournamentDTO> {
    const { data } = await api.patch<TournamentDTO>(`/tournaments/${id}/structure`, params);
    return data;
  },

  async getSummary(id: string): Promise<any> {
    const { data } = await api.get(`/tournaments/${id}/summary`);
    return data;
  },

  async getBracket(id: string): Promise<BracketMatchDTO[]> {
    const { data } = await api.get<BracketMatchDTO[]>(`/tournaments/${id}/bracket`);
    return data;
  },

  async generateRefereeCode(id: string): Promise<{ refereeCode: string; expiresAt: string }> {
    const { data } = await api.post<{ refereeCode: string; expiresAt: string }>(`/tournaments/${id}/generate-referee-code`);
    return data;
  },

  async getBanners(): Promise<string[]> {
    const { data } = await api.get<string[]>("/tournaments/banners");
    return data;
  },
};
