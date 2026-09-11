import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

import { messageForCode } from "./errorMessages";

const GENERIC_MESSAGES = new Set([
  "Bad Request Exception",
  "Internal Server Error",
  "Unauthorized",
  "Forbidden resource",
  "Not Found",
]);

/** Código de erro que a API devolve no corpo (ex.: "EMAIL_NOT_VERIFIED"), quando houver. */
export function getErrorCode(err: any): string | undefined {
  const code = err?.response?.data?.code;
  return typeof code === "string" ? code : undefined;
}

export function getErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  // Prefer the mapped friendly message for the backend error code.
  const mapped = messageForCode(data?.code);
  if (mapped) return mapped;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join("\n");
  if (typeof msg === "string" && !GENERIC_MESSAGES.has(msg)) return msg;
  return fallback;
}

if (!process.env.EXPO_PUBLIC_API_URL && !__DEV__) {
  throw new Error(
    "EXPO_PUBLIC_API_URL not set — set it in eas.json's build profile env before building for production/preview.",
  );
}
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.6:3000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rotas que nao dependem de access token: um 401 vindo delas e a resposta em si (credencial
// errada, email nao verificado, codigo invalido), nao um token expirado. Sem esta lista o
// interceptor tentaria renovar o token e, se a renovacao falhasse, rejeitaria com o erro do
// refresh — apagando o `code` que a tela precisa para reagir.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-code",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
  "/auth/google",
];

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.startsWith(path) || url.includes(path));
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest?.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        useAuthStore.getState().setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
