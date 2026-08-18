import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";

interface Member {
  id: string;
  name: string;
  initials: string;
  username: string;
  isCaptain: boolean;
  colorBg: string;
  colorText: string;
  isGradient?: boolean;
}

interface HistoryEntry {
  id: string;
  tournament: string;
  round: string;
  date: string;
  medal: string;
  isWin: boolean;
}

const MOCK_MEMBERS: Member[] = [
  { id: "m1", name: "Lucas Costa", initials: "LC", username: "@lucascosta", isCaptain: true, colorBg: "", colorText: "#fff", isGradient: true },
  { id: "m2", name: "Rafael Silva", initials: "RS", username: "@rafasilva", isCaptain: false, colorBg: "#221B33", colorText: "#CFC8E0" },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "h1", tournament: "Copa Verão 2026", round: "Semifinal · 12 Jul", date: "", medal: "🥇", isWin: true },
  { id: "h2", tournament: "Copa Inverno 2026", round: "Quartas · 28 Jun", date: "", medal: "🥈", isWin: false },
];

export function TeamDetailScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";

  const teamName = "Silva & Rocha";
  const teamInitials = "SR";
  const teamFormat = "Dupla · Areia";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 22, paddingTop: 14 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header with back + edit */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation?.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Editar time"
            style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2}>
              <Path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </Svg>
            <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Editar</Text>
          </Pressable>
        </View>

        {/* Team avatar + name */}
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          <LinearGradient
            colors={["#8B5CF6", "#6D3BEA"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              alignItems: "center", justifyContent: "center", marginBottom: 12,
              shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 28, elevation: 6,
            }}
          >
            <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 26, fontWeight: "700" }}>{teamInitials}</Text>
          </LinearGradient>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>{teamName}</Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", marginTop: 4 }}>{teamFormat}</Text>
        </View>

        {/* Stats bar */}
        <View style={{
          flexDirection: "row",
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 18, marginBottom: 20,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          {[
            { value: "3", label: "Torneios" },
            { value: "2", label: "Vitórias" },
            { value: "67%", label: "Win rate" },
          ].map((stat, i, arr) => (
            <View key={stat.label} style={{
              flex: 1, alignItems: "center", paddingVertical: 16,
              borderRightWidth: i < arr.length - 1 ? 1 : 0,
              borderRightColor: dividerColor,
            }}>
              <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>{stat.value}</Text>
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Members */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>JOGADORES</Text>
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Convidar jogador">
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>+ Convidar</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {MOCK_MEMBERS.map((m) => (
            <View
              key={m.id}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 14, padding: 12, paddingHorizontal: 14,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 1 }),
              }}
            >
              {m.isGradient ? (
                <LinearGradient
                  colors={["#8B5CF6", "#6D3BEA"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{m.initials}</Text>
                </LinearGradient>
              ) : (
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: isDark ? m.colorBg : "#F0ECFA",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: isDark ? m.colorText : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{m.initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>{m.name}</Text>
                <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{m.username}</Text>
              </View>
              <View style={{
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: m.isCaptain
                  ? (isDark ? "rgba(198,248,42,.12)" : "#EAF7C4")
                  : (isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.05)"),
              }}>
                <Text style={{
                  color: m.isCaptain
                    ? (isDark ? "#C6F82A" : "#5C7A00")
                    : (isDark ? "#6E6684" : "#9488A6"),
                  fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700",
                }}>
                  {m.isCaptain ? "CAPITÃO" : "MEMBRO"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* History */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>HISTÓRICO</Text>
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Ver todos">
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>Ver todos →</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {MOCK_HISTORY.map((h) => (
            <View
              key={h.id}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 14, padding: 12, paddingHorizontal: 14,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 1 }),
              }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: h.isWin
                  ? (isDark ? "rgba(198,248,42,.12)" : "rgba(124,58,237,.1)")
                  : "rgba(192,192,192,.08)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={h.isWin ? accentColor : (isDark ? "#6E6684" : "#C3BCD4")} strokeWidth={2}>
                  <Path d="M6 9V2h12v7a6 6 0 01-12 0z" />
                  <Path d="M9 21h6M12 15v6" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>{h.tournament}</Text>
                <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{h.round}</Text>
              </View>
              <Text style={{ color: h.isWin ? accentColor : labelColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{h.medal}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
