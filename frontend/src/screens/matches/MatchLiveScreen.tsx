import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { View, Text, Pressable, StatusBar, ScrollView, ActivityIndicator, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "@/hooks/useApi";
import { matchesService, SetScoreDTO } from "@/services/matchesService";
import { getSocket } from "@/services/socket";
import { Icon } from "@/components/ui/Icon";
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
    onAccent: "#FFFFFF",
  }), [isDark, colors]);
}

function PulseDot({ color }: { color: string }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(s, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [s]);
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = s.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <View style={{ width: 7, height: 7, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
    </View>
  );
}

// The backend's raw match payload has no `initials` field (only id/name/avatarUrl)
// — derive it client-side like every other team-avatar spot in the app does,
// otherwise a team without a custom avatarUrl renders a blank circle.
function getInitials(name?: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function renderTeamAvatar(initials: string, isTeamA: boolean, size: number, C: ReturnType<typeof useScreenColors>, avatarUrl?: string | null) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size * 0.32 }} contentFit="cover" cachePolicy="memory-disk" />;
  }
  if (isTeamA) {
    return (
      <LinearGradient colors={["#8B5CF6", "#6D3BEA"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: size * 0.36 }}>{initials}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: size * 0.34 }}>{initials}</Text>
    </View>
  );
}

export function MatchLiveScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const matchId = route?.params?.matchId;
  const { data: match, loading, error, refetch } = useApi(() => matchesService.findOne(matchId), [matchId]);
  const { data: timeline, refetch: refetchTimeline } = useApi(() => matchesService.getTimeline(matchId), [matchId]);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); refetchTimeline({ keepData: false }); }, [refetch, refetchTimeline]));

  // Socket-pushed set scores override whatever the last REST fetch had, so a
  // point lands on screen the instant the referee taps it — no polling.
  const [liveSets, setLiveSets] = useState<SetScoreDTO[] | null>(null);
  const [liveScore, setLiveScore] = useState<{ a: number; b: number } | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const socket = getSocket();
    socket.emit("match:join", { matchId });

    const onPoint = (payload: any) => {
      if (payload?.matchId !== matchId) return;
      setLiveSets(payload.sets ?? null);
      setLiveScore({ a: payload.scoreA, b: payload.scoreB });
      refetchTimeline({ keepData: true });
    };
    const onFinish = (payload: any) => {
      if (payload?.matchId && payload.matchId !== matchId) return;
      navigation?.replace("MatchResult", { matchId });
    };
    const onUpdate = (payload: any) => {
      if (payload?.matchId && payload.matchId !== matchId) return;
      refetch({ keepData: true });
      refetchTimeline({ keepData: true });
    };

    socket.on("match:point", onPoint);
    socket.on("match:finish", onFinish);
    socket.on("match:update", onUpdate);
    socket.on("match:set-finish", onUpdate);

    return () => {
      socket.emit("match:leave", { matchId });
      socket.off("match:point", onPoint);
      socket.off("match:finish", onFinish);
      socket.off("match:update", onUpdate);
      socket.off("match:set-finish", onUpdate);
    };
  }, [matchId, navigation, refetch, refetchTimeline]);

  const sets = liveSets ?? match?.sets ?? [];
  const scoreTeamA = liveScore?.a ?? match?.scoreTeamA ?? 0;
  const scoreTeamB = liveScore?.b ?? match?.scoreTeamB ?? 0;
  const currentSet = sets.length > 0 ? sets[sets.length - 1] : null;

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
          <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <Pressable onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation.replace("MainTabs")} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={19} color={C.tx} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,77,94,0.14)", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 }}>
              <PulseDot color={C.danger} />
              <Text style={{ color: C.danger, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4 }}>AO VIVO</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Live score card */}
        <View style={{ borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, padding: 22, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              {renderTeamAvatar(getInitials(match?.teamA?.name), true, 54, C, match?.teamA?.avatarUrl)}
              <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 8, textAlign: "center" }}>{match?.teamA?.name ?? ""}</Text>
            </View>
            <View style={{ alignItems: "center", paddingHorizontal: 10 }}>
              <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>
                {currentSet ? `SET ${currentSet.setNumber}` : ""}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 56, lineHeight: 56 }}>{currentSet?.scoreA ?? 0}</Text>
                <Text style={{ color: C.tx3, fontFamily: "Anton_400Regular", fontSize: 24 }}>:</Text>
                <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 56, lineHeight: 56 }}>{currentSet?.scoreB ?? 0}</Text>
              </View>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              {renderTeamAvatar(getInitials(match?.teamB?.name), false, 54, C, match?.teamB?.avatarUrl)}
              <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 12, marginTop: 8, textAlign: "center" }}>{match?.teamB?.name ?? ""}</Text>
            </View>
          </View>

          {/* Sets won so far */}
          <View style={{ alignItems: "center", marginBottom: sets.length > 1 ? 14 : 0 }}>
            <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Sets</Text>
            <Text style={{ fontFamily: "Anton_400Regular", fontSize: 16 }}>
              <Text style={{ color: C.tx }}>{scoreTeamA}</Text>
              <Text style={{ color: C.tx3 }}>{"  "}—{"  "}</Text>
              <Text style={{ color: C.tx }}>{scoreTeamB}</Text>
            </Text>
          </View>

          {sets.length > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
              {sets.map((s, i) => (
                <React.Fragment key={s.setNumber}>
                  {i > 0 && <View style={{ width: 1, backgroundColor: C.cardBorder }} />}
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 0.6, marginBottom: 3 }}>SET {s.setNumber}</Text>
                    <Text style={{ fontFamily: "Anton_400Regular", fontSize: 15 }}>
                      <Text style={{ color: s.scoreA > s.scoreB ? C.lime : C.tx3 }}>{s.scoreA}</Text>
                      <Text style={{ color: C.tx3 }}>{"  :  "}</Text>
                      <Text style={{ color: s.scoreB > s.scoreA ? C.lime : C.tx3 }}>{s.scoreB}</Text>
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {match?.category ? (
          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 12, textAlign: "center", marginBottom: 20 }}>{match.category}{match.format ? ` · ${match.format}` : ""}</Text>
        ) : null}

        {/* Timeline — newest first (already sorted that way server-side) */}
        {timeline && timeline.length > 0 && (
          <>
            <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, marginBottom: 12 }}>LINHA DO TEMPO</Text>
            <View style={{ gap: 2 }}>
              {timeline.map((ev, i) => (
                <TimelineRow key={`${ev.type}-${ev.timestamp}-${i}`} event={ev} match={match} C={C} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineRow({ event, match, C }: { event: any; match: any; C: ReturnType<typeof useScreenColors> }) {
  const isTeamA = event.team === "A";
  const isTeamB = event.team === "B";
  const teamName = isTeamA ? match?.teamA?.name : isTeamB ? match?.teamB?.name : null;
  const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

  const meta: Record<string, { icon: any; label: string }> = {
    POINT: { icon: "check-circle", label: teamName ? `Ponto — ${teamName}` : "Ponto" },
    TIMEOUT: { icon: "clock", label: teamName ? `Tempo técnico — ${teamName}` : "Tempo técnico" },
    SUBSTITUTION: { icon: "users", label: teamName ? `Substituição — ${teamName}` : "Substituição" },
    SIDE_SWITCH: { icon: "external", label: "Troca de lado" },
    MATCH_START: { icon: "play", label: "Início da partida" },
    SET_FINISH: { icon: "check-circle", label: `Fim do set ${event.setNumber ?? ""}` },
    MATCH_FINISH: { icon: "trophy", label: "Fim da partida" },
    WALKOVER: { icon: "info-circle", label: "W.O." },
  };
  const info = meta[event.type] ?? { icon: "info-circle", label: event.type };
  const isPoint = event.type === "POINT";
  const hasTeam = isTeamA || isTeamB;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
      {hasTeam ? (
        renderTeamAvatar(getInitials(teamName), isTeamA, 32, C, isTeamA ? match?.teamA?.avatarUrl : match?.teamB?.avatarUrl)
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center" }}>
          <Icon name={info.icon} size={15} color={C.lime} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 12.5 }}>{info.label}</Text>
        {isPoint && event.scoreA != null && event.scoreB != null && (
          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 1 }}>
            Set {event.setNumber} · {event.scoreA}-{event.scoreB}
          </Text>
        )}
      </View>
      <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 10.5 }}>{time}</Text>
    </View>
  );
}
