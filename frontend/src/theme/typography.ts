import { TextStyle } from "react-native";

type TypographyPreset = {
  fontFamily: string;
  fontSize: number;
  fontWeight: TextStyle["fontWeight"];
  lineHeight?: number;
  letterSpacing?: number;
};

export const typography = {
  // --- Condensed display (Widelab DNA): Anton for oversized caps/numbers, Oswald for tracked labels ---
  heroName: { fontFamily: "Anton_400Regular", fontSize: 34, fontWeight: "400", letterSpacing: 0.2, lineHeight: 34 } as TypographyPreset,
  statNumber: { fontFamily: "Anton_400Regular", fontSize: 32, fontWeight: "400", letterSpacing: 0.3, lineHeight: 32 } as TypographyPreset,
  bignumber: { fontFamily: "Anton_400Regular", fontSize: 56, fontWeight: "400", letterSpacing: 0.5, lineHeight: 54 } as TypographyPreset,
  ghostName: { fontFamily: "Anton_400Regular", fontSize: 74, fontWeight: "400", letterSpacing: 1, lineHeight: 66 } as TypographyPreset,
  overline: { fontFamily: "Oswald_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 1.4, lineHeight: 14 } as TypographyPreset,
  ctaCaps: { fontFamily: "Oswald_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 1.2, lineHeight: 16 } as TypographyPreset,

  display: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 36, fontWeight: "800", letterSpacing: -0.03 * 36 } as TypographyPreset,
  splash: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 28, fontWeight: "700", letterSpacing: -0.02 * 28 } as TypographyPreset,
  h1: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24 } as TypographyPreset,
  h2: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22 } as TypographyPreset,
  h3: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700", letterSpacing: -0.02 * 20 } as TypographyPreset,
  h4: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" } as TypographyPreset,
  section: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700" } as TypographyPreset,
  btnLabel: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 } as TypographyPreset,
  tab: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" } as TypographyPreset,
  btnSm: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" } as TypographyPreset,
  badge: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.06 * 10 } as TypographyPreset,
  badgeSm: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700", letterSpacing: 0.06 * 9 } as TypographyPreset,
  sectionLabel: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700", letterSpacing: 0.06 * 11 } as TypographyPreset,

  cardTitle: { fontFamily: "Manrope_600SemiBold", fontSize: 15, fontWeight: "600" } as TypographyPreset,
  infoLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" } as TypographyPreset,
  inputValue: { fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500" } as TypographyPreset,
  body: { fontFamily: "Manrope_400Regular", fontSize: 13.5, fontWeight: "400", lineHeight: 13.5 * 1.6 } as TypographyPreset,
  list: { fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" } as TypographyPreset,
  subtitle: { fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" } as TypographyPreset,
  caption: { fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" } as TypographyPreset,
  fine: { fontFamily: "Manrope_400Regular", fontSize: 11.5, fontWeight: "400", lineHeight: 11.5 * 1.5 } as TypographyPreset,
  tabBar: { fontFamily: "Manrope_600SemiBold", fontSize: 10, fontWeight: "600" } as TypographyPreset,
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" } as TypographyPreset,
  placeholder: { fontFamily: "Manrope_400Regular", fontSize: 14, fontWeight: "400" } as TypographyPreset,
} as const;
