import { api } from "./api";

export interface ConsentsDTO {
  terms: boolean;
  notificationsPush: boolean;
  locationDiscovery: boolean;
  marketingEmail: boolean;
}

export interface DataSummaryDTO {
  teams: number;
  tournaments: number;
  matches: number;
  registrations: number;
  friendlies: number;
  notifications: number;
}

export interface TermsStatusDTO {
  version: string;
  lastAcceptedAt: string | null;
  lastAcceptedVersion: string | null;
  termsOutdated: boolean;
}

export interface UpdateConsentsParams {
  notificationsPush?: boolean;
  locationDiscovery?: boolean;
  marketingEmail?: boolean;
}

export interface ConsentHistoryEntry {
  id: string;
  version: string;
  purpose: "TERMS" | "NOTIFICATIONS_PUSH" | "LOCATION_DISCOVERY" | "MARKETING_EMAIL";
  accepted: boolean;
  createdAt: string;
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
    const { data } = await api.get<{ consents: ConsentsDTO }>("/me/consents");
    return data.consents;
  },

  async updateConsents(params: UpdateConsentsParams): Promise<ConsentsDTO> {
    const { data } = await api.put<{ consents: ConsentsDTO }>("/me/consents", params);
    return data.consents;
  },

  async getConsentHistory(): Promise<ConsentHistoryEntry[]> {
    const { data } = await api.get<ConsentHistoryEntry[]>("/me/consents/history");
    return data;
  },

  async acceptTerms(): Promise<void> {
    await api.post("/me/consents/accept-terms");
  },

  // Real backend shape of GET /me/consents (nested under `consents`, includes
  // `termsOutdated`). Kept separate from getConsents()'s (legacy, flat) return
  // type so existing callers of getConsents() aren't affected.
  async getTermsStatus(): Promise<TermsStatusDTO> {
    const { data } = await api.get<TermsStatusDTO>("/me/consents");
    return data;
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
