import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ATLETA" | "ORGANIZADOR" | "SUPER_ADMIN";
  avatarUrl?: string | null;
  phone?: string;
  bio?: string;
  isEmailVerified: boolean;
  isFirstAccess: boolean;
  twoFactorEnabled: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  visitorActive: boolean;
  _hasHydrated: boolean;

  setAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User) => void;
  setVisitorActive: (active: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      visitorActive: false,
      _hasHydrated: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true, visitorActive: false }),

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      setVisitorActive: (active) => set({ visitorActive: active }),

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "toqueplay-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
