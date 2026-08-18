import { api } from "./api";
import { FriendlyStatus } from "@/types/enums";

export interface FriendlyAthleteDTO {
  id: string;
  teamMemberId: string;
  side: string;
  isCaptain: boolean;
  teamMember: {
    id: string;
    user: { id: string; name: string; avatarUrl: string | null };
  };
}

export interface FriendlyDTO {
  id: string;
  title: string | null;
  description: string | null;
  requesterId: string;
  requester: { id: string; name: string; avatarUrl: string | null };
  requesterTeamId: string | null;
  requesterTeam: { id: string; name: string; avatarUrl: string | null } | null;
  challengedId: string | null;
  challenged: { id: string; name: string; avatarUrl: string | null } | null;
  challengedTeamId: string | null;
  challengedTeam: { id: string; name: string; avatarUrl: string | null } | null;
  status: FriendlyStatus;
  date: string;
  startTime: string | null;
  address: string | null;
  addressNumber: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  regionRadius: number | null;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  modality: string | null;
  categoryFormat: string | null;
  matchId: string | null;
  refereeCode: string | null;
  refereeCodeExpiresAt: string | null;
  athletes: FriendlyAthleteDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFriendlyParams {
  title?: string;
  description?: string;
  requesterTeamId?: string;
  challengedId?: string;
  challengedTeamId?: string;
  date: string;
  startTime?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  regionRadius?: number;
  modality?: string;
  categoryFormat?: string;
  athleteIds?: string[];
  captainId?: string;
}

export interface QueryFriendlyParams {
  status?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const friendliesService = {
  async create(params: CreateFriendlyParams): Promise<FriendlyDTO> {
    const { data } = await api.post<FriendlyDTO>("/friendlies", params);
    return data;
  },

  async findMine(query?: QueryFriendlyParams): Promise<FriendlyDTO[]> {
    const { data } = await api.get<FriendlyDTO[]>("/friendlies", { params: query });
    return data;
  },

  async findOne(id: string): Promise<FriendlyDTO> {
    const { data } = await api.get<FriendlyDTO>(`/friendlies/${id}`);
    return data;
  },

  async accept(id: string, athleteIds: string[], captainId?: string): Promise<FriendlyDTO> {
    const { data } = await api.patch<FriendlyDTO>(`/friendlies/${id}/accept`, { athleteIds, captainId });
    return data;
  },

  async reject(id: string): Promise<FriendlyDTO> {
    const { data } = await api.patch<FriendlyDTO>(`/friendlies/${id}/reject`);
    return data;
  },

  async cancel(id: string): Promise<FriendlyDTO> {
    const { data } = await api.patch<FriendlyDTO>(`/friendlies/${id}/cancel`);
    return data;
  },

  async selectAthletes(id: string, athleteIds: string[]): Promise<FriendlyDTO> {
    const { data } = await api.patch<FriendlyDTO>(`/friendlies/${id}/select-athletes`, { athleteIds });
    return data;
  },

  async generateRefereeCode(id: string): Promise<{ refereeCode: string; expiresAt: string }> {
    const { data } = await api.post<{ refereeCode: string; expiresAt: string }>(`/friendlies/${id}/generate-referee-code`);
    return data;
  },

  async enterRefereeCode(code: string): Promise<FriendlyDTO> {
    const { data } = await api.post<FriendlyDTO>("/friendlies/referee-enter", { code });
    return data;
  },
};
