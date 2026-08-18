import { api } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isFirstAccess: boolean;
  isEmailVerified: boolean;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginResponse extends AuthResponse {}

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  temporaryToken: string;
  userId: string;
}

export type LoginResult = LoginResponse | TwoFactorRequiredResponse;

function isTwoFactorRequired(data: LoginResult): data is TwoFactorRequiredResponse {
  return "twoFactorRequired" in data && data.twoFactorRequired === true;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await api.post<LoginResult>("/auth/login", { email, password });
    return data;
  },

  async register(params: {
    name: string;
    email: string;
    cpf: string;
    password: string;
    confirmPassword: string;
    consent: boolean;
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/register", params);
    return data;
  },

  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/verify-email", { email, code });
    return data;
  },

  async resendCode(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/resend-code", { email });
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
    return data;
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return data;
  },

  async verify2fa(temporaryToken: string, code: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/verify-2fa", {
      temporaryToken,
      code,
    });
    return data;
  },

  async googleAuth(token: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/google", { token });
    return data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  isTwoFactorRequired,
};
