import { api } from "./api";

export interface ConsentsDTO {
  notificationsPush: boolean;
  locationDiscovery: boolean;
  marketingEmail: boolean;
  termsVersion: string;
  termsAcceptedAt: string | null;
}

export interface DataSummaryDTO {
  teams: number;
  tournaments: number;
  matches: number;
  registrations: number;
  friendlies: number;
  notifications: number;
}

export interface UpdateConsentsParams {
  notificationsPush?: boolean;
  locationDiscovery?: boolean;
  marketingEmail?: boolean;
}

export interface DpoRequestParams {
  type: string;
  subject: string;
  message: string;
  email: string;
  name?: string;
}

export const privacyService = {
  async getConsents(): Promise<ConsentsDTO> {
    const { data } = await api.get<ConsentsDTO>("/me/consents");
    return data;
  },

  async updateConsents(params: UpdateConsentsParams): Promise<ConsentsDTO> {
    const { data } = await api.put<ConsentsDTO>("/me/consents", params);
    return data;
  },

  async acceptTerms(): Promise<void> {
    await api.post("/me/consents/accept-terms");
  },

  async getDataSummary(): Promise<DataSummaryDTO> {
    const { data } = await api.get<DataSummaryDTO>("/me/data-summary");
    return data;
  },

  async exportData(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/me/export");
    return data;
  },

  async deleteAccount(email: string): Promise<void> {
    await api.delete("/me/delete-account", { data: { email } });
  },

  async createDpoRequest(params: DpoRequestParams): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>("/me/dpo-contact", params);
    return data;
  },
};
