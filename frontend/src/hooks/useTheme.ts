import { useMemo } from "react";
import { useThemeStore } from "@/stores/themeStore";
import { getThemeColors, brand, semantic, ThemeMode } from "@/theme/colors";
import { shadowsDark, shadowsLight } from "@/theme/shadows";

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  const theme = useMemo(() => {
    const colors = getThemeColors(mode);
    const shadows = mode === "dark" ? shadowsDark : shadowsLight;
    return { mode: mode as ThemeMode, colors, brand, semantic, shadows, isDark: mode === "dark" };
  }, [mode]);

  return { ...theme, toggle };
}
