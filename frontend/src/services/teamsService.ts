import { api } from "./api";
import { InvitationStatus, TournamentFormat, TournamentModality } from "@/types/enums";

export interface TeamMemberDTO {
  id: string;
  role: string;
  isCaptain: boolean;
  positions: string[];
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    username?: string;
  };
}

export interface TeamDTO {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
  members: TeamMemberDTO[];
  _count?: { members: number };
  stats?: { tournaments: number; wins: number; winRate: number };
}

export interface TeamInvitationDTO {
  id: string;
  teamId: string;
  userId: string;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: string | null;
  createdAt: string;
  team: {
    id: string;
    name: string;
    avatarUrl: string | null;
    members: TeamMemberDTO[];
  };
  inviter: { id: string; name: string; username?: string };
}

export interface CreateTeamParams {
  name: string;
  description?: string;
  city?: string;
  state?: string;
}

export interface AddMemberParams {
  email: string;
  cpf?: string;
  isCaptain?: boolean;
  positions?: string[];
}

export const teamsService = {
  async list(): Promise<TeamDTO[]> {
    const { data } = await api.get<TeamDTO[]>("/teams");
    return data;
  },

  async findOne(id: string): Promise<TeamDTO> {
    const { data } = await api.get<TeamDTO>(`/teams/${id}`);
    return data;
  },

  async create(params: CreateTeamParams): Promise<TeamDTO> {
    const { data } = await api.post<TeamDTO>("/teams", params);
    return data;
  },

  async update(id: string, params: Partial<CreateTeamParams>): Promise<TeamDTO> {
    const { data } = await api.patch<TeamDTO>(`/teams/${id}`, params);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/teams/${id}`);
  },

  async listMembers(teamId: string): Promise<TeamMemberDTO[]> {
    const { data } = await api.get<TeamMemberDTO[]>(`/teams/${teamId}/members`);
    return data;
  },

  async addMember(teamId: string, params: AddMemberParams): Promise<TeamMemberDTO> {
    const { data } = await api.post<TeamMemberDTO>(`/teams/${teamId}/members`, params);
    return data;
  },

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
  },

  async getPendingInvitations(): Promise<TeamInvitationDTO[]> {
    const { data } = await api.get<TeamInvitationDTO[]>("/team-invitations/pending");
    return data;
  },

  async acceptInvitation(invitationId: string): Promise<TeamInvitationDTO> {
    const { data } = await api.patch<TeamInvitationDTO>(`/team-invitations/${invitationId}/accept`);
    return data;
  },

  async rejectInvitation(invitationId: string): Promise<TeamInvitationDTO> {
    const { data } = await api.patch<TeamInvitationDTO>(`/team-invitations/${invitationId}/reject`);
    return data;
  },
};
