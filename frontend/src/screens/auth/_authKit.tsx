/**
 * Auth DNA kit — shared building blocks for the redesigned auth screens.
 * "Widelab DNA": black bg · Anton/Oswald condensed · Split palette (purple fills, lime accent).
 * Presentation only. No business logic lives here.
 * Local to auth for now; promote to src/components/ui once the whole app migrates.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Icon, IconName } from "@/components/ui/Icon";
import { useTheme } from "@/hooks/useTheme";

export function useAC() {
  const { isDark, colors } = useTheme();
  return {
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
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
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  } as const;
}

/* ---------------- Field ---------------- */
interface FieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, error, leftIcon, secureTextEntry, style, ...rest }: FieldProps) {
  const AC = useAC();
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  const onFocus = useCallback((e: any) => { setFocused(true); rest.onFocus?.(e); }, [rest.onFocus]);
  const onBlur = useCallback((e: any) => { setFocused(false); rest.onBlur?.(e); }, [rest.onBlur]);

  const borderColor = error ? AC.danger : focused ? AC.lime : AC.cardBorder;
  const iconColor = error ? AC.danger : focused ? AC.lime : AC.tx3;

  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: AC.tx2, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: AC.card,
          borderWidth: 1.5,
          borderColor,
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 13,
          gap: 9,
        }}
      >
        {leftIcon ? <Icon name={leftIcon} size={16} color={iconColor} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={secure}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor={AC.tx3}
          style={{ flex: 1, fontFamily: "Manrope_500Medium", fontSize: 14, color: AC.tx, padding: 0 }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setSecure((s) => !s)} hitSlop={8}>
            <Icon name={secure ? "eye" : "eye-off"} size={16} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ fontFamily: "Manrope_500Medium", fontSize: 11.5, color: AC.danger, marginTop: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/* ---------------- Primary button (lime) ---------------- */
export function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const AC = useAC();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled ?? loading}
      style={{
        width: "100%",
        backgroundColor: AC.purple,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        opacity: loading || disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase", color: AC.onAccent }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------- Ghost/secondary button ---------------- */
export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const AC = useAC();
  return (
    <Pressable
      onPress={onPress}
      style={{ width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}
    >
      <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: AC.tx }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------- Notched lime CTA (signature ticket/stadium motif) ---------------- */
export function NotchedButton({ label, onPress, loading, withArrow }: { label: string; onPress: () => void; loading?: boolean; withArrow?: boolean }) {
  const AC = useAC();
  return (
    <Pressable onPress={onPress} disabled={loading} style={{ position: "relative" }}>
      <View style={{ backgroundColor: AC.purple, borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: loading ? 0.7 : 1 }}>
        <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.6, textTransform: "uppercase", color: AC.onAccent }}>
          {label}
        </Text>
        {withArrow && !loading ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={AC.onAccent} strokeWidth={2.6}>
            <Path d="M5 12h14M13 6l6 6-6 6" />
          </Svg>
        ) : null}
      </View>
      <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: AC.bg }} />
      <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: AC.bg }} />
    </Pressable>
  );
}

/* ---------------- Full-bleed hero (photo-forward: image bleeds, ghost wordmark, giant Anton title) ---------------- */
export function AuthHero({
  image,
  height,
  overline,
  titleLines,
  accentWord,
  subtitle,
  onBack,
  showBrand,
  titleSize = 46,
}: {
  image: string;
  height: number;
  overline?: string;
  titleLines: string[];
  accentWord?: string; // rendered in lime wherever it appears
  subtitle?: string;
  onBack?: () => void;
  showBrand?: boolean;
  titleSize?: number;
}) {
  const AC = useAC();
  const renderLine = (line: string, i: number) => {
    const base = { fontFamily: "Anton_400Regular", fontSize: titleSize, lineHeight: titleSize * 0.96, letterSpacing: 0.4, color: AC.tx, textTransform: "uppercase" as const };
    if (accentWord && line.toUpperCase().includes(accentWord.toUpperCase())) {
      const idx = line.toUpperCase().indexOf(accentWord.toUpperCase());
      const pre = line.slice(0, idx);
      const mid = line.slice(idx, idx + accentWord.length);
      const post = line.slice(idx + accentWord.length);
      return (
        <Text key={i} style={base}>
          {pre}<Text style={{ color: AC.lime }}>{mid}</Text>{post}
        </Text>
      );
    }
    return <Text key={i} style={base}>{line}</Text>;
  };

  return (
    <View style={{ height, position: "relative", overflow: "hidden", backgroundColor: AC.bg }}>
      {/* ghost wordmark behind the subject */}
      <Text
        numberOfLines={1}
        style={{
          position: "absolute", top: height * 0.1, left: -6, right: -6, textAlign: "center",
          fontFamily: "Anton_400Regular", fontSize: height * 0.2, lineHeight: height * 0.2,
          letterSpacing: 1, color: "rgba(255,255,255,0.05)",
        }}
      >
        TOQUEPLAY
      </Text>

      <Image source={{ uri: image }} style={{ position: "absolute", top: 0, left: 0, right: 0, height }} contentFit="cover" cachePolicy="memory-disk" />
      {/* purple wash */}
      <LinearGradient
        colors={["rgba(124,58,237,0.45)", "rgba(124,58,237,0.06)", "transparent"]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.5 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height }}
      />
      {/* fade to black */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)", "#000000"]}
        locations={[0.3, 0.62, 0.85, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height }}
      />

      {onBack ? (
        <Pressable
          onPress={onBack}
          style={{ position: "absolute", top: 50, left: 20, width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={AC.tx} strokeWidth={2.2}>
            <Path d="m15 6-6 6 6 6" />
          </Svg>
        </Pressable>
      ) : null}

      {showBrand ? (
        <View style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>ToquePlay</Text>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image source={require("@/../assets/logo.png")} style={{ width: 22, height: 22 }} contentFit="contain" cachePolicy="memory-disk" />
          </View>
        </View>
      ) : null}

      <View style={{ position: "absolute", left: 20, right: 20, bottom: 18 }}>
        {overline ? (
          <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: AC.lime, marginBottom: 6 }}>
            {overline}
          </Text>
        ) : null}
        {titleLines.map(renderLine)}
        {subtitle ? (
          <Text style={{ fontFamily: "Manrope_500Medium", fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 10, maxWidth: 280, lineHeight: 19 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
