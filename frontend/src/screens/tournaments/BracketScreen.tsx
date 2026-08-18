import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";

type Phase = "quarters" | "semis" | "final";
type GameStatus = "completed" | "live" | "pending";

interface TeamScore {
  initials: string;
  name: string;
  sets: (number | null)[];
  isWinner?: boolean;
  gradient?: boolean;
}

interface BracketGame {
  id: string;
  status: GameStatus;
  label: string;
  court: string;
  time?: string;
  team1: TeamScore;
  team2: TeamScore;
}

const PHASE_TABS: { key: Phase; label: string }[] = [
  { key: "quarters", label: "Quartas" },
  { key: "semis", label: "Semis" },
  { key: "final", label: "Final" },
];

const GAMES: BracketGame[] = [
  {
    id: "1", status: "completed", label: "CONCLUÍDO", court: "Jogo 1 · Quadra A",
    team1: { initials: "SR", name: "Silva & Rocha", sets: [21, 21], isWinner: true, gradient: true },
    team2: { initials: "TF", name: "Thunder Flex", sets: [15, 12] },
  },
  {
    id: "2", status: "live", label: "AO VIVO · SET 2", court: "Jogo 2 · Quadra B",
    team1: { initials: "PA", name: "Praia Aces", sets: [21, 14] },
    team2: { initials: "SB", name: "Sand Blockers", sets: [18, 16] },
  },
  {
    id: "3", status: "completed", label: "CONCLUÍDO", court: "Jogo 3 · Quadra A",
    team1: { initials: "VN", name: "Vôlei Norte", sets: [21, 19, 15], isWinner: true },
    team2: { initials: "RS", name: "Red Spikes", sets: [18, 21, 11] },
  },
  {
    id: "4", status: "pending", label: "16:00", court: "Jogo 4 · Quadra B", time: "16:00",
    team1: { initials: "AS", name: "Areia Storm", sets: [null] },
    team2: { initials: "BV", name: "Beach Voltz", sets: [null] },
  },
];

function getStatusColor(status: GameStatus, isDark: boolean) {
  switch (status) {
    case "completed": return isDark ? "#C6F82A" : "#5C7A00";
    case "live": return "#EF4444";
    case "pending": return isDark ? "#6E6684" : "#9488A6";
  }
}

function getDotColor(status: GameStatus, isDark: boolean) {
  switch (status) {
    case "completed": return isDark ? "#C6F82A" : "#5C7A00";
    case "live": return "#EF4444";
    case "pending": return isDark ? "#6E6684" : "#C3BCD4";
  }
}

export function BracketScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [activePhase, setActivePhase] = useState<Phase>("quarters");
  const bgBase = isDark ? "#0C0A12" : "#F7F5FC";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const scoreBgWin = isDark ? "#C6F82A" : "#7C3AED";
  const scoreColorWin = isDark ? "#12100A" : "#fff";
  const scoreBgLose = isDark ? "#1C1630" : "#F0ECFA";
  const scoreColorLose = isDark ? "#6E6684" : "#9488A6";
  const scoreColorActive = isDark ? "#F5F3FA" : "#1A1428";
  const courtColor = isDark ? "#6E6684" : "#9488A6";
  const pendingDash = isDark ? "#3A3350" : "#C3BCD4";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <Pressable
            onPress={() => navigation?.goBack()}
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "#171320" : "#fff",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,0.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700", letterSpacing: -0.01 * 20 }}>Chaveamento</Text>
            <Text style={{ color: isDark ? "#948CA8" : "#847B98", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>Copa Verão 2026 · Masc Dupla</Text>
          </View>
        </View>
      </View>

      {/* Phase tabs */}
      <View style={{
        flexDirection: "row", marginHorizontal: 22, marginTop: 16, marginBottom: 14,
        backgroundColor: isDark ? "#141019" : "#fff",
        borderRadius: 14, borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)",
        padding: 4,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
      }}>
        {PHASE_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActivePhase(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center",
              backgroundColor: activePhase === tab.key ? accentColor : "transparent",
            }}
          >
            <Text style={{
              fontFamily: activePhase === tab.key ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_600SemiBold",
              fontSize: 12,
              fontWeight: activePhase === tab.key ? "700" : "600",
              color: activePhase === tab.key
                ? (isDark ? "#12100A" : "#fff")
                : (isDark ? "#6E6684" : "#9488A6"),
            }}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const statusColor = getStatusColor(game.status, isDark);
          const dotColor = getDotColor(game.status, isDark);
          const isLive = game.status === "live";

          return (
            <View key={game.id} style={{
              borderRadius: 18, padding: 16, marginBottom: 12,
              borderWidth: 1,
              ...(isLive
                ? {
                    borderColor: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.18)",
                    ...(isDark ? {} : { shadowColor: "rgba(239,68,68,0.25)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
                  }
                : {
                    borderColor: cardBorder,
                    backgroundColor: cardBg,
                    ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
                  }),
            }}>
              {isLive && isDark && (
                <LinearGradient
                  colors={["rgba(239,68,68,0.06)", "rgba(12,10,18,0)"]}
                  start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 17 }}
                />
              )}
              {isLive && !isDark && (
                <LinearGradient
                  colors={["rgba(239,68,68,0.04)", "#fff"]}
                  start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 17 }}
                />
              )}

              {/* Status row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
                  <Text style={{ color: statusColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.06 * 10 }}>{game.label}</Text>
                </View>
                <Text style={{ color: courtColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{game.court}</Text>
              </View>

              {/* Teams */}
              {[game.team1, game.team2].map((team, idx) => {
                const isWinner = team.isWinner;
                const isLoser = !isWinner && game.status === "completed";
                const isPending = game.status === "pending";
                const avatarBg = team.gradient
                  ? undefined
                  : (isDark ? "#221B33" : "#F0ECFA");
                const avatarColor = team.gradient
                  ? "#fff"
                  : (isDark ? "#CFC8E0" : "#7C3AED");
                const nameColor = isLoser
                  ? (isDark ? "#6E6684" : "#9488A6")
                  : (isDark ? "#F5F3FA" : "#1A1428");

                return (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: idx === 0 ? 8 : 0 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 10,
                      backgroundColor: avatarBg,
                      alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {team.gradient && (
                        <LinearGradient
                          colors={["#8B5CF6", "#6D3BEA"]}
                          start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
                          style={{ position: "absolute", width: "100%", height: "100%" }}
                        />
                      )}
                      <Text style={{ color: avatarColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700" }}>{team.initials}</Text>
                    </View>
                    <Text style={{ flex: 1, color: nameColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>{team.name}</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {team.sets.map((score, si) => {
                        if (score === null) {
                          return (
                            <View key={si} style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: scoreBgLose, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: pendingDash, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700" }}>—</Text>
                            </View>
                          );
                        }
                        const otherSets = (idx === 0 ? game.team2 : game.team1).sets;
                        const otherScore = otherSets[si];
                        const wonSet = otherScore !== null && score > (otherScore ?? 0);
                        const isCurrentSet = isLive && si === team.sets.length - 1;

                        let bg: string;
                        let color: string;
                        if (wonSet && !isPending) {
                          bg = scoreBgWin;
                          color = scoreColorWin;
                        } else if (isCurrentSet) {
                          bg = scoreBgLose;
                          color = scoreColorActive;
                        } else {
                          bg = scoreBgLose;
                          color = scoreColorLose;
                        }

                        return (
                          <View key={si} style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700" }}>{score}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 14, paddingVertical: 10, flexWrap: "wrap" }}>
          {[
            { color: isDark ? "#C6F82A" : "#5C7A00", label: "Concluído" },
            { color: "#EF4444", label: "Ao vivo" },
            { color: isDark ? "#6E6684" : "#C3BCD4", label: "Pendente" },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
