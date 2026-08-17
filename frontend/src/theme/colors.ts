export const brand = {
  primary: "#7C3AED",
  primaryLight: "#8B5CF6",
  accentLime: "#C6F82A",
  purpleDeep: "#2D1B69",
  limeText: "#12100A",
} as const;

export const dark = {
  bg: {
    base: "#0C0A12",
    card: "#141019",
    elevated: "#171320",
    interactive: "#1C1630",
    frame: "#050409",
    sheet: "#161222",
  },
  text: {
    primary: "#F5F3FA",
    secondary: "#CFC8E0",
    tertiary: "#A9A2BC",
    muted: "#948CA8",
    disabled: "#6E6684",
  },
  border: {
    card: "rgba(255,255,255,0.06)",
    input: "rgba(255,255,255,0.08)",
    ghost: "rgba(255,255,255,0.1)",
    focused: "rgba(139,92,246,0.25)",
    activeLime: "#C6F82A",
    error: "#EF4444",
  },
  accent: {
    active: "#C6F82A",
    inactive: "#6E6684",
  },
} as const;

export const light = {
  bg: {
    base: "#F6F4FC",
    card: "#FFFFFF",
    frame: "#ECEAF4",
    interactive: "#F0ECFA",
  },
  text: {
    primary: "#1A1030",
    secondary: "#4A4460",
    tertiary: "#6B6480",
    muted: "#8A829E",
    disabled: "#A29CB4",
  },
  border: {
    card: "rgba(26,16,48,0.06)",
    input: "rgba(26,16,48,0.08)",
    ghost: "rgba(26,16,48,0.1)",
    focused: "rgba(124,58,237,0.2)",
    activePurple: "rgba(124,58,237,0.3)",
    error: "#EF4444",
  },
  accent: {
    active: "#7C3AED",
    inactive: "#A29CB4",
  },
} as const;

export const semantic = {
  success: "#34D399",
  successDark: "#059669",
  successBg: "#D1FAE5",
  warning: "#FBBF24",
  warningDark: "#D97706",
  error: "#EF4444",
  errorLight: "#FF6B79",
  errorBg: "#FEE2E2",
} as const;

export const avatarPoolDark = [
  { bg: "#2D1B69", text: "#C6F82A" },
  { bg: "#1C4A3D", text: "#34D399" },
  { bg: "#4A1942", text: "#F472B6" },
  { bg: "#3D2A1A", text: "#FBBF24" },
  { bg: "#3D1A1A", text: "#FCA5A5" },
] as const;

export const avatarPoolLight = [
  { bg: "#E8DEFF", text: "#7C3AED" },
  { bg: "#D1FAE5", text: "#059669" },
  { bg: "#FCE7F3", text: "#DB2777" },
] as const;

export type ThemeMode = "dark" | "light";

export function getThemeColors(mode: ThemeMode) {
  return mode === "dark"
    ? { bg: dark.bg, text: dark.text, border: dark.border, accent: dark.accent }
    : { bg: { ...light.bg, elevated: light.bg.card, sheet: light.bg.card }, text: light.text, border: light.border, accent: light.accent };
}
