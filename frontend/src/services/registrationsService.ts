import { api } from "./api";
import {
  RegistrationStatus,
  TournamentType,
  TournamentFormat,
  TournamentModality,
} from "@/types/enums";

export interface RegistrationMemberDTO {
  id: string;
  teamMemberId: string;
  isCaptain: boolean;
  teamMember: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  };
}

export interface RegistrationDTO {
  id: string;
  tournamentId: string;
  categoryId: string;
  teamId: string;
  userId: string;
  status: RegistrationStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  tournament: { id: string; name: string; status: string };
  category: {
    id: string;
    type: TournamentType;
    format: TournamentFormat;
    modality: TournamentModality;
    registrationPrice: number;
  };
  team: { id: string; name: string };
  user: { id: string; name: string; email: string };
  members: RegistrationMemberDTO[];
}

export interface RegisterTeamParams {
  teamId: string;
  categoryId: string;
  memberIds: string[];
  captainMemberId?: string;
}

export interface RegisteredMembersResponse {
  memberIds: string[];
}

export const registrationsService = {
  async listMine(): Promise<RegistrationDTO[]> {
    const { data } = await api.get<RegistrationDTO[]>("/registrations");
    return data;
  },

  async findOne(id: string): Promise<RegistrationDTO> {
    const { data } = await api.get<RegistrationDTO>(`/registrations/${id}`);
    return data;
  },

  async cancel(id: string): Promise<RegistrationDTO> {
    const { data } = await api.delete<RegistrationDTO>(`/registrations/${id}`);
    return data;
  },

  async registerTeam(
    tournamentId: string,
    params: RegisterTeamParams,
  ): Promise<RegistrationDTO> {
    const { data } = await api.post<RegistrationDTO>(
      `/tournaments/${tournamentId}/register`,
      params,
    );
    return data;
  },

  async getRegisteredMembers(
    tournamentId: string,
    teamId: string,
  ): Promise<RegisteredMembersResponse> {
    const { data } = await api.get<RegisteredMembersResponse>(
      `/tournaments/${tournamentId}/registered-members`,
      { params: { teamId } },
    );
    return data;
  },
};
