import React from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import Svg, { Path, Circle, Rect, Polyline, Line } from "react-native-svg";

interface StatRow {
  label: string;
  teamA: number;
  teamB: number;
  invertWinner?: boolean;
}

const MOCK_STATS: StatRow[] = [
  { label: "Pontos totais", teamA: 42, teamB: 33 },
  { label: "Aces", teamA: 8, teamB: 5 },
  { label: "Erros", teamA: 3, teamB: 7, invertWinner: true },
  { label: "Bloqueios", teamA: 12, teamB: 6 },
];

export function MatchResultScreen({ navigation, route }: any) {
  const { isDark } = useTheme();

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const separatorColor = isDark ? "#3A3350" : "#DFD7EE";
  const loserScoreColor = isDark ? "#6E6684" : "#9488A6";
  const teamBBg = isDark ? "#221B33" : "#F0ECFA";
  const teamBText = isDark ? "#CFC8E0" : "#7C3AED";
  const barBgColor = isDark ? "#3A3350" : "#E4DEF2";
  const statLabelColor = isDark ? "#948CA8" : "#847B98";

  const winnerGradientColors = isDark
    ? ["rgba(198,248,42,.12)", "rgba(139,92,246,.08)"] as const
    : ["rgba(124,58,237,.1)", "rgba(92,122,0,.06)"] as const;
  const winnerBorderColor = isDark ? "rgba(198,248,42,.2)" : "rgba(124,58,237,.15)";

  const nextMatchBg = isDark ? "rgba(139,92,246,.1)" : "rgba(124,58,237,.07)";
  const nextMatchBorder = isDark ? "rgba(139,92,246,.2)" : "rgba(124,58,237,.15)";

  const renderTeamAvatar = (initials: string, isTeamA: boolean, size: number) => {
    if (isTeamA) {
      return (
        <LinearGradient
          colors={["#8B5CF6", "#6D3BEA"]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{
            width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center",
            shadowColor: "rgba(124,58,237,.6)", shadowOpacity: 1, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: size * 0.36 }}>{initials}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: teamBBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: teamBText, fontFamily: "SpaceGrotesk_700Bold", fontSize: size * 0.34 }}>{initials}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: labelColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 12 }}>PARTIDA ENCERRADA</Text>
          <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 10, opacity: 0.6, marginBottom: 18 }}>Copa Verão 2026 · Semifinal</Text>
        </View>

        {/* Winner card */}
        <LinearGradient
          colors={[...winnerGradientColors]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 16,
            borderWidth: 1, borderColor: winnerBorderColor, overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? "rgba(198,248,42,.06)" : "rgba(124,58,237,.05)" }} />
          <View style={{ position: "absolute", bottom: -30, left: -15, width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(139,92,246,.06)" : "rgba(92,122,0,.05)" }} />

          <Text style={{ fontSize: 22, marginBottom: 10 }}>🏆</Text>
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, letterSpacing: 0.88, marginBottom: 10 }}>VENCEDOR</Text>
          {renderTeamAvatar("SR", true, 56)}
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, letterSpacing: -0.22, marginTop: 10 }}>Silva & Rocha</Text>
        </LinearGradient>

        {/* Score final card */}
        <View style={{
          borderRadius: 22, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          padding: 20, marginBottom: 16,
          ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 10 }, shadowRadius: 13, elevation: 6 }),
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 18 }}>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar("SR", true, 44)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>Silva & Rocha</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 48, lineHeight: 48 }}>2</Text>
              <Text style={{ color: separatorColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 }}>:</Text>
              <Text style={{ color: loserScoreColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 48, lineHeight: 48 }}>0</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar("PA", false, 44)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>Praia Aces</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: dividerColor }}>
            {[
              { set: 1, a: 21, b: 18 },
              { set: 2, a: 21, b: 15 },
            ].map((s, i) => (
              <React.Fragment key={s.set}>
                {i > 0 && <View style={{ width: 1, backgroundColor: dividerColor }} />}
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 9, letterSpacing: 0.72, marginBottom: 3 }}>SET {s.set}</Text>
                  <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 14 }}>
                    <Text style={{ color: accentColor }}>{s.a}</Text>
                    <Text style={{ color: separatorColor }}>  :  </Text>
                    <Text style={{ color: loserScoreColor }}>{s.b}</Text>
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Stats */}
        <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>ESTATÍSTICAS</Text>
        <View style={{
          borderRadius: 18, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          padding: 16, marginBottom: 16, gap: 14,
          ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 4 }),
        }}>
          {MOCK_STATS.map((stat) => {
            const aWins = stat.invertWinner ? stat.teamA < stat.teamB : stat.teamA > stat.teamB;
            const aColor = aWins ? accentColor : (stat.invertWinner && stat.teamA > stat.teamB ? loserScoreColor : loserScoreColor);
            const bColor = !aWins ? (stat.invertWinner ? "#EF4444" : accentColor) : (stat.invertWinner ? "#EF4444" : loserScoreColor);
            const barAColor = stat.invertWinner ? barBgColor : accentColor;
            const barBColor = stat.invertWinner ? "#EF4444" : barBgColor;

            return (
              <View key={stat.label} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: stat.invertWinner && stat.teamA > stat.teamB ? loserScoreColor : (aWins ? accentColor : loserScoreColor), fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, width: 36 }}>
                  {stat.teamA}
                </Text>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={{ color: statLabelColor, fontFamily: "Manrope_500Medium", fontSize: 11, textAlign: "center", marginBottom: 4 }}>{stat.label}</Text>
                  <View style={{ flexDirection: "row", gap: 3, height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ flex: stat.teamA, backgroundColor: stat.invertWinner ? barBgColor : accentColor, borderRadius: 3 }} />
                    <View style={{ flex: stat.teamB, backgroundColor: stat.invertWinner ? "#EF4444" : barBgColor, borderRadius: 3 }} />
                  </View>
                </View>
                <Text style={{ color: stat.invertWinner && stat.teamB > stat.teamA ? "#EF4444" : (!aWins && !stat.invertWinner ? accentColor : loserScoreColor), fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, width: 36, textAlign: "right" }}>
                  {stat.teamB}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Duration / Timeouts / Cards */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /><Path d="M12 6v6l4 2" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /></Svg>, value: "48min", label: "Duração" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M10 2h4v7l3-2v10l-3-2v7h-4z" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /></Svg>, value: "2", label: "Timeouts" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Rect x={6} y={3} width={12} height={18} rx={2} stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} fill="none" /></Svg>, value: "0", label: "Cartões" },
          ].map((item) => (
            <View key={item.label} style={{
              flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 14, paddingVertical: 14, alignItems: "center",
              ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 3 }),
            }}>
              {item.icon}
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, marginTop: 6 }}>{item.value}</Text>
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Next match */}
        <Pressable
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            backgroundColor: nextMatchBg, borderWidth: 1, borderColor: nextMatchBorder,
            borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16,
          }}
          accessibilityLabel="Próximo jogo"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="m9 6 6 6-6 6" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Próximo: Final</Text>
            <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>Silva & Rocha vs Vôlei Norte · 17:00</Text>
          </View>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="m9 6 6 6-6 6" stroke={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
          </Svg>
        </Pressable>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={{
              flex: 1, paddingVertical: 15, borderRadius: 16,
              backgroundColor: accentColor, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
              ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12, elevation: 8 }),
            }}
            accessibilityLabel="Compartilhar"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={isDark ? "#12100A" : "#FFFFFF"} strokeWidth={2.4} />
              <Polyline points="16 6 12 2 8 6" stroke={isDark ? "#12100A" : "#FFFFFF"} strokeWidth={2.4} fill="none" />
              <Line x1={12} y1={2} x2={12} y2={15} stroke={isDark ? "#12100A" : "#FFFFFF"} strokeWidth={2.4} />
            </Svg>
            <Text style={{ color: isDark ? "#12100A" : "#FFFFFF", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Compartilhar</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation?.goBack()}
            style={{
              flex: 1, paddingVertical: 15, borderRadius: 16,
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
              backgroundColor: "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
            }}
            accessibilityLabel="Ver bracket"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={9} stroke={titleColor} strokeWidth={2} />
              <Path d="M12 8v4l2 2" stroke={titleColor} strokeWidth={2} />
            </Svg>
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Ver bracket</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
