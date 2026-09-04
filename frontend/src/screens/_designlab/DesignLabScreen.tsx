/**
 * DESIGN LAB — throwaway preview screen to test the new "Widelab DNA" direction.
 * Not wired into navigation. Toggled via DESIGN_LAB flag in App.tsx.
 * Split palette: black bg · purple fills/heros · lime numbers/CTA/accents.
 * Condensed display: Anton (caps + numbers) · Oswald (tracked labels).
 * Safe to delete this whole folder once the direction is locked.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, Image, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  bg: "#000000",
  bg2: "#0B0B0D",
  card: "#16181C",
  cardBorder: "rgba(255,255,255,0.07)",
  purple: "#7C3AED",
  purpleV: "#8B3BFF",
  lime: "#C6F82A",
  tx: "#FFFFFF",
  tx2: "#9A94A8",
  limeInk: "#12100A",
};

// Volleyball hero candidates (remote, preview only). Tap the photo to cycle.
const HERO_OPTIONS = [
  { uri: "https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=760&q=80", label: "Mulher cortando" },
  { uri: "https://images.unsplash.com/photo-1686753768117-bf1a808689d7?w=760&q=80", label: "Mulher cortando (2)" },
  { uri: "https://images.unsplash.com/photo-1521138054413-5a47d349b7af?w=760&q=80", label: "Vôlei de praia" },
];

function Notch({ side }: { side: "left" | "right" }) {
  return (
    <View
      style={{
        position: "absolute",
        top: "50%",
        marginTop: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: C.bg,
        left: side === "left" ? -10 : undefined,
        right: side === "right" ? -10 : undefined,
      }}
    />
  );
}

function StatCard({
  value,
  label,
  feat,
  valueColor,
}: {
  value: string;
  label: string;
  feat?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 92,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        justifyContent: "space-between",
        overflow: "visible",
        backgroundColor: feat ? C.purple : C.card,
        borderWidth: feat ? 0 : 1,
        borderColor: C.cardBorder,
      }}
    >
      {feat && <Notch side="left" />}
      {feat && <Notch side="right" />}
      <Text
        style={{
          fontFamily: "Oswald_600SemiBold",
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: feat ? "rgba(255,255,255,0.75)" : C.tx2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Anton_400Regular",
          fontSize: 34,
          lineHeight: 36,
          letterSpacing: 0.5,
          color: valueColor ?? (feat ? C.tx : C.lime),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function DesignLabScreen() {
  const [heroIdx, setHeroIdx] = useState(0);
  const hero = HERO_OPTIONS[heroIdx];
  const cycleHero = () => setHeroIdx((i) => (i + 1) % HERO_OPTIONS.length);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* dev banner */}
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 }}>
            <Text style={{ fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 1.5, color: C.tx2, textTransform: "uppercase" }}>
              Design Lab · teste de fonte + DNA
            </Text>
          </View>

          {/* ===== HERO ===== */}
          <Pressable onPress={cycleHero} style={{ height: 420, position: "relative" }}>
            {/* ghost name behind subject */}
            <Text
              style={{
                position: "absolute",
                top: 26,
                left: 0,
                right: 0,
                textAlign: "center",
                fontFamily: "Anton_400Regular",
                fontSize: 88,
                lineHeight: 88,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.06)",
              }}
            >
              LUANA
            </Text>

            <Image source={{ uri: hero.uri }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }} resizeMode="cover" />
            {/* purple tint */}
            <LinearGradient
              colors={["rgba(124,58,237,0.45)", "rgba(124,58,237,0.05)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }}
            />
            {/* fade to black */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.2)", "#000000"]}
              start={{ x: 0, y: 0.35 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }}
            />

            {/* header buttons */}
            <View style={{ position: "absolute", top: 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.tx, fontSize: 20, marginTop: -2 }}>‹</Text>
              </View>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.tx, fontSize: 15 }}>↗</Text>
              </View>
            </View>

            {/* name + location */}
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 16 }}>
              <Text style={{ fontFamily: "Anton_400Regular", fontSize: 40, lineHeight: 40, letterSpacing: 0.5, color: C.tx, textTransform: "uppercase" }}>
                Luana Reis
              </Text>
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ backgroundColor: C.lime, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 }}>
                  <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1, color: C.limeInk, textTransform: "uppercase" }}>
                    📍 Praia Grande · Levantadora
                  </Text>
                </View>
              </View>
            </View>

            {/* tap-to-cycle hint */}
            <View style={{ position: "absolute", top: 58, right: 16, zIndex: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
              <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.8, color: C.tx, textTransform: "uppercase" }}>
                Toque · foto {heroIdx + 1}/{HERO_OPTIONS.length}
              </Text>
            </View>
          </Pressable>

          {/* ===== STAT GRID ===== */}
          <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatCard value="148" label={"Pontos\nno torneio"} feat />
              <StatCard value="72%" label="Aproveit." />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatCard value="23" label="Aces" />
              <StatCard value="9" label="Vitórias" />
            </View>
          </View>

          {/* ===== LIVE MATCH CARD ===== */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.lime, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.limeInk }} />
                <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 1, color: C.limeInk }}>AO VIVO</Text>
              </View>
              <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.2, color: C.tx2, textTransform: "uppercase" }}>Copa Verão · Quadra 3</Text>
            </View>

            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#2D1B69", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 15, color: C.lime }}>TB</Text>
                  </View>
                  <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 12, color: C.tx, letterSpacing: 0.5 }}>Tubarões</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontFamily: "Anton_400Regular", fontSize: 46, color: C.lime, letterSpacing: 0.5 }}>23</Text>
                  <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 14, color: C.tx2 }}>×</Text>
                  <Text style={{ fontFamily: "Anton_400Regular", fontSize: 46, color: C.tx, letterSpacing: 0.5 }}>19</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#4A1942", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 15, color: "#F472B6" }}>BR</Text>
                  </View>
                  <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 12, color: C.tx, letterSpacing: 0.5 }}>Brisa</Text>
                </View>
              </View>
              <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
                <Text style={{ fontFamily: "Manrope_500Medium", fontSize: 12, color: C.tx2, textAlign: "center" }}>Set 3 · 25–23 · 21–25</Text>
              </View>
            </View>
          </View>

          {/* ===== CTA ===== */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Pressable style={{ backgroundColor: C.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, color: C.limeInk, textTransform: "uppercase" }}>
                Convidar para time
              </Text>
            </Pressable>
            <Pressable style={{ marginTop: 10, borderRadius: 16, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
              <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1.2, color: C.tx, textTransform: "uppercase" }}>
                Ver histórico
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
