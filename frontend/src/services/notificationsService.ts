import { api } from "./api";

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPageDTO {
  data: NotificationDTO[];
  total: number;
  page: number;
  limit: number;
}

export const notificationsService = {
  async list(page = 1, limit = 20, unread = false): Promise<NotificationsPageDTO> {
    const { data } = await api.get<NotificationsPageDTO>("/notifications", {
      params: { page, limit, unread: unread ? "true" : undefined },
    });
    return data;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const { data } = await api.get<{ count: number }>("/notifications/unread-count");
    return data;
  },

  async markAsRead(id: string): Promise<NotificationDTO> {
    const { data } = await api.patch<NotificationDTO>(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead(): Promise<void> {
    await api.patch("/notifications/read-all");
  },

  async registerDeviceToken(token: string, platform: string): Promise<void> {
    await api.post("/devices/token", { token, platform });
  },

  async removeDeviceToken(token: string): Promise<void> {
    await api.delete(`/devices/token/${token}`);
  },
};
