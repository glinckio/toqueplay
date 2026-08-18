import { api } from "./api";

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  username: string | null;
  city: string | null;
  state: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatsDTO {
  tournaments: number;
  wins: number;
  matches: number;
  winRate: number;
  teams: number;
}

export interface UpdateProfileParams {
  name?: string;
  phone?: string;
  bio?: string;
  username?: string;
  city?: string;
  state?: string;
}

export interface NotificationPreferencesDTO {
  pushEnabled: boolean;
  emailEnabled: boolean;
  matchUpdates: boolean;
  tournamentUpdates: boolean;
  teamInvites: boolean;
  friendlyRequests: boolean;
}

export const usersService = {
  async getProfile(): Promise<UserProfileDTO> {
    const { data } = await api.get<UserProfileDTO>("/users/me");
    return data;
  },

  async getMyStats(): Promise<UserStatsDTO> {
    const { data } = await api.get<UserStatsDTO>("/users/me/stats");
    return data;
  },

  async updateProfile(params: UpdateProfileParams): Promise<UserProfileDTO> {
    const { data } = await api.patch<UserProfileDTO>("/users/me", params);
    return data;
  },

  async updateLocation(latitude: number, longitude: number): Promise<void> {
    await api.patch("/users/me/location", { latitude, longitude });
  },

  async getNotificationPreferences(): Promise<NotificationPreferencesDTO> {
    const { data } = await api.get<NotificationPreferencesDTO>("/users/me/notification-preferences");
    return data;
  },

  async updateNotificationPreferences(params: Partial<NotificationPreferencesDTO>): Promise<NotificationPreferencesDTO> {
    const { data } = await api.patch<NotificationPreferencesDTO>("/users/me/notification-preferences", params);
    return data;
  },

  async uploadAvatar(file: FormData): Promise<{ avatarUrl: string }> {
    const { data } = await api.post<{ avatarUrl: string }>("/users/me/avatar", file, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
