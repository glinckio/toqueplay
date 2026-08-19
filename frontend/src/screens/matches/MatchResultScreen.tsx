import React from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import Svg, { Path, Circle, Rect, Polyline, Line } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { matchesService } from "@/services/matchesService";

interface StatRow {
  label: string;
  teamA: number;
  teamB: number;
  invertWinner?: boolean;
}

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

  const matchId = route?.params?.matchId;
  const { data: match, loading, error, refetch } = useApi(() => matchesService.findOne(matchId), [matchId]);

  const winner = match?.winnerId === match?.teamA?.id ? match?.teamA : match?.teamB;
  const loser = match?.winnerId === match?.teamA?.id ? match?.teamB : match?.teamA;

  const stats: StatRow[] = match?.stats ? [
    { label: "Pontos totais", teamA: match.stats.totalPoints.A, teamB: match.stats.totalPoints.B },
    { label: "Aces", teamA: match.stats.aces.A, teamB: match.stats.aces.B },
    { label: "Erros", teamA: match.stats.errors.A, teamB: match.stats.errors.B, invertWinner: true },
    { label: "Bloqueios", teamA: match.stats.blocks.A, teamB: match.stats.blocks.B },
  ] : [];

  const durationText = match?.duration ? `${match.duration}min` : "--";
  const timeoutsText = match?.timeouts ? `${match.timeouts.A + match.timeouts.B}` : "0";
  const cardsText = match?.cards ? `${match.cards.A + match.cards.B}` : "0";

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

  if (loading && !match) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !match) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}
      >

        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: labelColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 12 }}>PARTIDA ENCERRADA</Text>
          <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 10, opacity: 0.6, marginBottom: 18 }}>
            {match?.tournamentName ?? ""}{match?.round ? ` · ${match.round}` : ""}
          </Text>
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
          {renderTeamAvatar(winner?.initials ?? "", winner?.id === match?.teamA?.id, 56)}
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, letterSpacing: -0.22, marginTop: 10 }}>{winner?.name ?? ""}</Text>
        </LinearGradient>

        {/* Score final card */}
        <View style={{
          borderRadius: 22, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          padding: 20, marginBottom: 16,
          ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 10 }, shadowRadius: 13, elevation: 6 }),
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 18 }}>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar(match?.teamA?.initials ?? "", true, 44)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>{match?.teamA?.name ?? ""}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ color: match?.winnerId === match?.teamA?.id ? accentColor : loserScoreColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 48, lineHeight: 48 }}>{match?.scoreTeamA ?? 0}</Text>
              <Text style={{ color: separatorColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 }}>:</Text>
              <Text style={{ color: match?.winnerId === match?.teamB?.id ? accentColor : loserScoreColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 48, lineHeight: 48 }}>{match?.scoreTeamB ?? 0}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar(match?.teamB?.initials ?? "", false, 44)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>{match?.teamB?.name ?? ""}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: dividerColor }}>
            {(match?.sets ?? []).map((s, i) => (
              <React.Fragment key={s.setNumber}>
                {i > 0 && <View style={{ width: 1, backgroundColor: dividerColor }} />}
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 9, letterSpacing: 0.72, marginBottom: 3 }}>SET {s.setNumber}</Text>
                  <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 14 }}>
                    <Text style={{ color: accentColor }}>{s.scoreA}</Text>
                    <Text style={{ color: separatorColor }}>  :  </Text>
                    <Text style={{ color: loserScoreColor }}>{s.scoreB}</Text>
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Stats */}
        {stats.length > 0 && (
          <>
            <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>ESTATÍSTICAS</Text>
            <View style={{
              borderRadius: 18, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              padding: 16, marginBottom: 16, gap: 14,
              ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 4 }),
            }}>
              {stats.map((stat) => {
                const aWins = stat.invertWinner ? stat.teamA < stat.teamB : stat.teamA > stat.teamB;
                const aColor = aWins ? accentColor : (stat.invertWinner && stat.teamA > stat.teamB ? loserScoreColor : loserScoreColor);
                const bColor = !aWins ? (stat.invertWinner ? "#EF4444" : accentColor) : (stat.invertWinner ? "#EF4444" : loserScoreColor);

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
          </>
        )}

        {/* Duration / Timeouts / Cards */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /><Path d="M12 6v6l4 2" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /></Svg>, value: durationText, label: "Duração" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M10 2h4v7l3-2v10l-3-2v7h-4z" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} /></Svg>, value: timeoutsText, label: "Timeouts" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Rect x={6} y={3} width={12} height={18} rx={2} stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} fill="none" /></Svg>, value: cardsText, label: "Cartões" },
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
        {match?.nextMatch && (
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
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Próximo: {match.nextMatch.round}</Text>
              <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>
                {winner?.name ?? ""} vs {match.nextMatch.opponentName}{match.nextMatch.scheduledAt ? ` · ${match.nextMatch.scheduledAt}` : ""}
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="m9 6 6 6-6 6" stroke={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
            </Svg>
          </Pressable>
        )}

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
