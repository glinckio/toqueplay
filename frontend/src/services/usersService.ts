import { api } from "./api";

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  nameColor: string | null;
  emailColor: string | null;
  themeMode: "dark" | "light";
  username: string | null;
  city: string | null;
  state: string | null;
  role: string;
  latitude: number | null;
  longitude: number | null;
  nearbyRadiusKm: number;
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
  nameColor?: string;
  emailColor?: string;
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

  async getPublicProfile(userId: string): Promise<UserProfileDTO & { stats: UserStatsDTO }> {
    const { data } = await api.get<UserProfileDTO & { stats: UserStatsDTO }>(`/users/${userId}/profile`);
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

  async updateNearbyRadius(nearbyRadiusKm: number): Promise<{ nearbyRadiusKm: number }> {
    const { data } = await api.patch<{ nearbyRadiusKm: number }>("/users/me/location", { nearbyRadiusKm });
    return data;
  },

  async updateTheme(themeMode: "dark" | "light"): Promise<{ themeMode: string }> {
    const { data } = await api.patch<{ themeMode: string }>("/users/me/theme", { themeMode });
    return data;
  },

  async getNotificationPreferences(): Promise<NotificationPreferencesDTO> {
    const { data } = await api.get<NotificationPreferencesDTO>("/users/me/notification-preferences");
    return data;
  },

  async updateNotificationPreferences(params: Partial<NotificationPreferencesDTO>): Promise<NotificationPreferencesDTO> {
    const { data } = await api.patch<NotificationPreferencesDTO>("/users/me/notification-preferences", params);
    return data;
  },

  async uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }> {
    const { data } = await api.post<{ avatarUrl: string }>("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data) => data,
    });
    return data;
  },

  async uploadBanner(formData: FormData): Promise<{ bannerUrl: string }> {
    const { data } = await api.post<{ bannerUrl: string }>("/users/me/banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data) => data,
    });
    return data;
  },
};
