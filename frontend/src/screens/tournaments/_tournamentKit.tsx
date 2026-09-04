/**
 * Tournament flow DNA kit — shared primitives for the redesigned tournament screens.
 * "Widelab DNA": black bg · Anton/Oswald condensed · purple primary · lime accent · framed-tilt motif.
 * Presentation only.
 */
import React from "react";
import { View, Text, Pressable, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

export function useTC() {
  const { isDark, colors } = useTheme();
  return {
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    purpleDeep: "#2D1B69",
    lime: "#C6F82A",
    limeInk: "#12100A",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    danger: "#FF4D5E",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    dangerTintBg: isDark ? "rgba(255,77,94,0.1)" : "#FDE8EA",
    dangerTintBorder: isDark ? "rgba(255,77,94,0.3)" : "rgba(255,77,94,0.35)",
    onAccent: "#FFFFFF",
    link: isDark ? "#C6F82A" : "#7C3AED",
  } as const;
}

export function VolleyballIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </Svg>
  );
}

/* Status pill — open / closed / live */
export function StatusPill({ label, tone = "open" }: { label: string; tone?: "open" | "closed" | "live" | "neutral" | "progress" }) {
  const TC = useTC();
  const map = {
    open: { bg: TC.limeTintBg, fg: TC.isDark ? TC.lime : TC.purple, dot: TC.isDark ? TC.lime : TC.purple },
    live: { bg: TC.lime, fg: TC.limeInk, dot: TC.limeInk },
    progress: { bg: TC.purple, fg: TC.onAccent, dot: TC.lime },
    closed: { bg: "rgba(255,255,255,0.1)", fg: "#C9C4D6", dot: TC.tx2 },
    neutral: { bg: TC.purpleTintBg, fg: TC.isDark ? "#B79BFF" : TC.purple, dot: TC.purple },
  }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: map.bg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: map.dot }} />
      <Text style={{ color: map.fg, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>{label}</Text>
    </View>
  );
}

/* Framed tilted thumbnail — signature motif. Falls back to volleyball icon. */
export function FramedThumb({ image, size = 72, tilt = -4, dim = false }: { image?: string | null; size?: number; tilt?: number; dim?: boolean }) {
  const TC = useTC();
  return (
    <View style={{ width: size, height: size, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: dim ? "rgba(255,255,255,0.14)" : "rgba(198,248,42,0.5)", transform: [{ rotate: `${tilt}deg` }], backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center" }}>
      {image ? (
        <>
          <Image source={{ uri: image }} style={{ width: "100%", height: "100%", opacity: dim ? 0.5 : 1 }} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.45)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }} />
        </>
      ) : (
        <VolleyballIcon size={size * 0.42} color={dim ? TC.tx3 : TC.lime} />
      )}
    </View>
  );
}

/* Filter chip — active = purple filled */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 12, backgroundColor: active ? TC.purple : TC.card, borderWidth: active ? 0 : 1, borderColor: TC.cardBorder }}>
      <Text style={{ color: active ? TC.onAccent : TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
    </Pressable>
  );
}

/* Section overline + optional right slot */
export function SectionLabel({ label, right, style }: { label: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const TC = useTC();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, style]}>
      <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
      {right}
    </View>
  );
}

/* Screen title (Anton) with optional overline */
export function ScreenTitle({ overline, title }: { overline?: string; title: string }) {
  const TC = useTC();
  return (
    <View style={{ marginBottom: 16 }}>
      {overline ? (
        <Text style={{ color: TC.link, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 3 }}>{overline}</Text>
      ) : null}
      <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 32, letterSpacing: 0.4, textTransform: "uppercase" }}>{title}</Text>
    </View>
  );
}

/* Meta row item (icon + text) */
export function MetaItem({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>{children}</View>;
}
