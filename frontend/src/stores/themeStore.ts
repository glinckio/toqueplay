import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode } from "@/theme/colors";
import { usersService } from "@/services/usersService";

interface ThemeState {
  mode: ThemeMode;
  // Local-only — used to hydrate from the account's saved preference on
  // login without bouncing straight back to the server.
  setMode: (mode: ThemeMode) => void;
  // User-driven change — persists to the account so it follows them to a
  // new device. Best-effort: a failed save just means it stays local-only
  // until the next successful toggle.
  setModeAndSync: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      setMode: (mode) => set({ mode }),
      setModeAndSync: (mode) => {
        set({ mode });
        usersService.updateTheme(mode).catch(() => {});
      },
      toggle: () => {
        const next = get().mode === "dark" ? "light" : "dark";
        set({ mode: next });
        usersService.updateTheme(next).catch(() => {});
      },
    }),
    {
      name: "toqueplay-theme",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
