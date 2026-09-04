import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { matchesService } from "@/services/matchesService";
import { useTheme } from "@/hooks/useTheme";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    purpleDeep: "#2D1B69",
    lime: "#C6F82A",
    limeInk: "#12100A",
    danger: "#FF4D5E",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
  }), [isDark, colors]);
}

interface StatRow {
  label: string;
  teamA: number;
  teamB: number;
  invertWinner?: boolean;
}

export function MatchResultScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const matchId = route?.params?.matchId;
  const { data: match, loading, error, refetch } = useApi(() => matchesService.findOne(matchId), [matchId]);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  // Don't fall back to teamB when winnerId is missing/null — that would
  // fabricate a "winner" for a match that isn't actually decided yet.
  const winner = match?.winnerId
    ? (match.winnerId === match?.teamA?.id ? match?.teamA : match?.teamB)
    : null;
  const loser = match?.winnerId
    ? (match.winnerId === match?.teamA?.id ? match?.teamB : match?.teamA)
    : null;

  const stats: StatRow[] = match?.stats ? [
    { label: "Pontos totais", teamA: match.stats.totalPoints.A, teamB: match.stats.totalPoints.B },
    { label: "Aces", teamA: match.stats.aces.A, teamB: match.stats.aces.B },
    { label: "Erros", teamA: match.stats.errors.A, teamB: match.stats.errors.B, invertWinner: true },
    { label: "Bloqueios", teamA: match.stats.blocks.A, teamB: match.stats.blocks.B },
  ] : [];

  // Backend never computes/returns `match.duration` — it's derived here from
  // the raw startedAt/finishedAt timestamps instead.
  const startedAt = (match as any)?.startedAt ? new Date((match as any).startedAt) : null;
  const finishedAt = (match as any)?.finishedAt ? new Date((match as any).finishedAt) : null;
  const durationMinutes = startedAt && finishedAt ? Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000)) : null;
  const durationText = durationMinutes != null ? `${durationMinutes}min` : "--";
  const timeoutsText = match?.timeouts ? `${match.timeouts.A + match.timeouts.B}` : "0";
  const cardsText = match?.cards ? `${match.cards.A + match.cards.B}` : "0";

  const renderTeamAvatar = (initials: string, isTeamA: boolean, size: number, avatarUrl?: string | null) => {
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size * 0.32 }} contentFit="cover" cachePolicy="memory-disk" />;
    }
    if (isTeamA) {
      return (
        <LinearGradient
          colors={["#8B5CF6", "#6D3BEA"]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: size * 0.36 }}>{initials}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: size * 0.34 }}>{initials}</Text>
      </View>
    );
  };

  if (loading && !match) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={C.lime} />
      </SafeAreaView>
    );
  }

  if (error && !match) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={() => refetch()} accessibilityRole="button">
          <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}
      >

        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 6 }}>
          <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, marginBottom: 12 }}>PARTIDA ENCERRADA</Text>
          <Text style={{ color: C.tx3, fontFamily: "Manrope_700Bold", fontSize: 10, marginBottom: 18 }}>
            {match?.tournamentName ?? ""}{match?.round ? ` · ${match.round}` : ""}
          </Text>
        </View>

        {/* Winner card — ticket-stub panel, framed-tilt avatar (signature motif) */}
        <View style={{ position: "relative", marginBottom: 16 }}>
          <LinearGradient
            colors={["#2D1B69", "#140E28"]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={{ borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 2, marginBottom: 14 }}>🏆 VENCEDOR</Text>
            <View style={{
              width: 72, height: 72, borderRadius: 22, overflow: "hidden",
              borderWidth: 2.5, borderColor: C.lime, transform: [{ rotate: "-3deg" }],
              backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center",
            }}>
              {renderTeamAvatar(winner?.initials ?? "", winner?.id === match?.teamA?.id, 72, winner?.avatarUrl)}
            </View>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase", marginTop: 14 }}>{winner?.name ?? ""}</Text>
          </LinearGradient>
          <View style={{ position: "absolute", left: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.bg }} />
          <View style={{ position: "absolute", right: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.bg }} />
        </View>

        {/* Score final card */}
        <View style={{ borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 18 }}>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar(match?.teamA?.initials ?? "", true, 44, match?.teamA?.avatarUrl)}
              <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>{match?.teamA?.name ?? ""}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ color: match?.winnerId === match?.teamA?.id ? C.lime : C.tx3, fontFamily: "Anton_400Regular", fontSize: 48, lineHeight: 48 }}>{match?.scoreTeamA ?? 0}</Text>
              <Text style={{ color: C.tx3, fontFamily: "Anton_400Regular", fontSize: 24 }}>:</Text>
              <Text style={{ color: match?.winnerId === match?.teamB?.id ? C.lime : C.tx3, fontFamily: "Anton_400Regular", fontSize: 48, lineHeight: 48 }}>{match?.scoreTeamB ?? 0}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              {renderTeamAvatar(match?.teamB?.initials ?? "", false, 44, match?.teamB?.avatarUrl)}
              <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 6 }}>{match?.teamB?.name ?? ""}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
            {(match?.sets ?? []).map((s, i) => (
              <React.Fragment key={s.setNumber}>
                {i > 0 && <View style={{ width: 1, backgroundColor: C.cardBorder }} />}
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 0.6, marginBottom: 3 }}>SET {s.setNumber}</Text>
                  <Text style={{ fontFamily: "Anton_400Regular", fontSize: 15 }}>
                    <Text style={{ color: s.scoreA > s.scoreB ? C.lime : C.tx3 }}>{s.scoreA}</Text>
                    <Text style={{ color: C.tx3 }}>  :  </Text>
                    <Text style={{ color: s.scoreB > s.scoreA ? C.lime : C.tx3 }}>{s.scoreB}</Text>
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Stats */}
        {stats.length > 0 && (
          <>
            <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, marginBottom: 12 }}>ESTATÍSTICAS</Text>
            <View style={{ borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 16, gap: 14 }}>
              {stats.map((stat) => {
                const aWins = stat.invertWinner ? stat.teamA < stat.teamB : stat.teamA > stat.teamB;

                return (
                  <View key={stat.label} style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: stat.invertWinner && stat.teamA > stat.teamB ? C.tx3 : (aWins ? C.lime : C.tx3), fontFamily: "Anton_400Regular", fontSize: 14, width: 36 }}>
                      {stat.teamA}
                    </Text>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, textAlign: "center", marginBottom: 4 }}>{stat.label}</Text>
                      <View style={{ flexDirection: "row", gap: 3, height: 6, borderRadius: 3, overflow: "hidden" }}>
                        <View style={{ flex: stat.teamA, backgroundColor: stat.invertWinner ? "rgba(255,255,255,0.14)" : C.lime, borderRadius: 3 }} />
                        <View style={{ flex: stat.teamB, backgroundColor: stat.invertWinner ? C.danger : "rgba(255,255,255,0.14)", borderRadius: 3 }} />
                      </View>
                    </View>
                    <Text style={{ color: stat.invertWinner && stat.teamB > stat.teamA ? C.danger : (!aWins && !stat.invertWinner ? C.lime : C.tx3), fontFamily: "Anton_400Regular", fontSize: 14, width: 36, textAlign: "right" }}>
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
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={C.lime} strokeWidth={2} /><Path d="M12 6v6l4 2" stroke={C.lime} strokeWidth={2} /></Svg>, value: durationText, label: "Duração" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M10 2h4v7l3-2v10l-3-2v7h-4z" stroke={C.lime} strokeWidth={2} /></Svg>, value: timeoutsText, label: "Timeouts" },
            { icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Rect x={6} y={3} width={12} height={18} rx={2} stroke={C.lime} strokeWidth={2} fill="none" /></Svg>, value: cardsText, label: "Cartões" },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              {item.icon}
              <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 18, marginTop: 6 }}>{item.value}</Text>
              <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Next match */}
        {match?.nextMatch && (
          <Pressable
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder,
              borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16,
            }}
            accessibilityLabel="Próximo jogo"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="m9 6 6 6-6 6" stroke={C.isDark ? C.lime : C.purple} strokeWidth={2} />
            </Svg>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 13 }}>Próximo: {match.nextMatch.round}</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>
                {winner?.name ?? ""} vs {match.nextMatch.opponentName}{match.nextMatch.scheduledAt ? ` · ${match.nextMatch.scheduledAt}` : ""}
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="m9 6 6 6-6 6" stroke={C.tx3} strokeWidth={2} />
            </Svg>
          </Pressable>
        )}

        {/* Action button — back to the bracket screen, which is also where the
            referee picks the next match to run */}
        <Pressable
          onPress={() => {
            const tournamentId = (match as any)?.bracket?.tournamentId;
            // navigate (not replace/push) — Bracket is already lower in the
            // stack (that's where "Apitar" was tapped from), so this pops
            // straight back to that existing instance, dropping Referee and
            // this MatchResult screen in one go. replace() only swapped the
            // top of the stack, leaving Referee stuck underneath — one
            // "voltar" would land back on it instead of truly exiting.
            if (tournamentId) navigation?.navigate("Bracket", { tournamentId });
            else navigation?.goBack();
          }}
          style={{
            paddingVertical: 16, borderRadius: 16, backgroundColor: C.purple,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          accessibilityLabel="Voltar ao chaveamento"
        >
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={C.onAccent} strokeWidth={2.4} />
          </Svg>
          <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase" }}>Voltar ao chaveamento</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
