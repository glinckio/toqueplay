import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode } from "@/theme/colors";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      setMode: (mode) => set({ mode }),
      toggle: () => set((s) => ({ mode: s.mode === "dark" ? "light" : "dark" })),
    }),
    {
      name: "toqueplay-theme",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
