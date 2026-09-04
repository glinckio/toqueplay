import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StatusBar, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { useTC } from "@/screens/tournaments/_tournamentKit";

/* Ticket-stub notched panel — signature motif, side chevron cutouts */
export function NotchedPanel({ children, bg }: { children: React.ReactNode; bg?: string }) {
  const TC = useTC();
  const resolvedBg = bg ?? TC.card;
  return (
    <View style={{ position: "relative", alignSelf: "stretch" }}>
      <View style={{ backgroundColor: resolvedBg, borderRadius: 20, padding: 18 }}>{children}</View>
      <View style={{ position: "absolute", left: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: TC.bg }} />
      <View style={{ position: "absolute", right: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: TC.bg }} />
    </View>
  );
}

export function NotchedButton({ label, onPress, disabled, loading, bg, textColor }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; bg?: string; textColor?: string }) {
  const TC = useTC();
  const resolvedBg = bg ?? TC.purple;
  const resolvedText = textColor ?? TC.tx;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ position: "relative" }}>
      <View style={{ backgroundColor: resolvedBg, borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: disabled ? 0.5 : 1 }}>
        {loading ? (
          <Animated.View>
            <Text style={{ color: resolvedText, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
          </Animated.View>
        ) : (
          <>
            <Text style={{ color: resolvedText, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={resolvedText} strokeWidth={2.6}>
              <Path d="M5 12h14M13 6l6 6-6 6" />
            </Svg>
          </>
        )}
      </View>
      <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
      <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
    </Pressable>
  );
}

/* "WELL DONE"-style dial medallion — dashed rotating ring + check core + top marker */
export function DialMedallion({ size = 128, accentColor }: { size?: number; accentColor?: string }) {
  const TC = useTC();
  const accent = accentColor ?? TC.lime;
  const spin = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 120, delay: 260, useNativeDriver: true }).start();
  }, [spin, checkScale]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const r = size / 2 - 6;
  const c = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: size, height: size, transform: [{ rotate }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={c} cy={c} r={r} stroke={accent} strokeOpacity={0.35} strokeWidth={2} fill="none" strokeDasharray="4 7" />
          <Circle cx={c} cy={6} r={4} fill={accent} />
        </Svg>
      </Animated.View>
      <Animated.View style={{
        width: size - 34, height: size - 34, borderRadius: (size - 34) / 2,
        backgroundColor: TC.purpleDeep, borderWidth: 2, borderColor: TC.purple,
        alignItems: "center", justifyContent: "center",
        transform: [{ scale: checkScale }],
      }}>
        <Svg width={size * 0.32} height={size * 0.32} viewBox="0 0 24 24" fill="none" stroke={TC.lime} strokeWidth={2.6}>
          <Path d="m5 12 5 5 9-11" />
        </Svg>
      </Animated.View>
    </View>
  );
}

interface CelebrationScreenProps {
  overline: string;
  title: string;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
  extra?: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryVariant?: "link" | "outline";
  // Overrides the default lime accent (dial medallion + overline). Tournament
  // registration success uses purple instead, to feel distinct from invites.
  accentColor?: string;
  // Overrides the CTA button's fill/text (defaults to purple bg / TC.tx text).
  ctaBg?: string;
  ctaTextColor?: string;
}

/* Shared centered success/celebration layout — used by team invite (sent + accepted)
   and tournament registration confirmations, so all three feel like one system. */
export function CelebrationScreen({
  overline, title, subtitle, children, extra, ctaLabel, onCta, secondaryLabel, onSecondary, secondaryVariant = "link", accentColor, ctaBg, ctaTextColor,
}: CelebrationScreenProps) {
  const TC = useTC();
  const accent = accentColor ?? TC.lime;
  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(14)).current;
  const cardO = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(20)).current;
  const extraO = useRef(new Animated.Value(0)).current;
  const ctaO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerO, { toValue: 1, duration: 480, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 480, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardO, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(extraO, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    Animated.timing(ctaO, { toValue: 1, duration: 500, delay: 700, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top", "bottom"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <View style={{ flex: 1, paddingHorizontal: 26, alignItems: "center", justifyContent: "center" }}>
        <DialMedallion accentColor={accent} />

        <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }], alignItems: "center" }}>
          <Text style={{ color: accent, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", marginTop: 22, marginBottom: 8 }}>
            {overline}
          </Text>
          <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 32, lineHeight: 34, letterSpacing: 0.3, textTransform: "uppercase", textAlign: "center", marginBottom: 10 }}>
            {title}
          </Text>
          <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 21, textAlign: "center", maxWidth: 280, marginBottom: 26 }}>
            {subtitle}
          </Text>
        </Animated.View>

        {children && (
          <Animated.View style={{ opacity: cardO, transform: [{ translateY: cardY }], alignSelf: "stretch" }}>
            <NotchedPanel>{children}</NotchedPanel>
          </Animated.View>
        )}

        {extra && (
          <Animated.View style={{ opacity: extraO, marginTop: 18 }}>
            {extra}
          </Animated.View>
        )}

        <Animated.View style={{ alignSelf: "stretch", marginTop: 30, opacity: ctaO }}>
          <NotchedButton label={ctaLabel} onPress={onCta} bg={ctaBg} textColor={ctaTextColor} />
          {!!secondaryLabel && onSecondary && (
            secondaryVariant === "outline" ? (
              <Pressable
                onPress={onSecondary}
                accessibilityRole="button"
                accessibilityLabel={secondaryLabel}
                style={{
                  width: "100%", paddingVertical: 16, borderRadius: 16, marginTop: 10,
                  borderWidth: 1, borderColor: TC.cardBorder,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={onSecondary} accessibilityRole="button" accessibilityLabel={secondaryLabel} style={{ marginTop: 14, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            )
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
