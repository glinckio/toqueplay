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

    if (error.response?.status === 401 && !originalRequest._retry) {
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
