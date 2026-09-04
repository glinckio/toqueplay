import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { tournamentsService } from "@/services/tournamentsService";
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
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ---------------- Hero ---------------- */
function RevealHero() {
  const C = useScreenColors();
  const o = useRef(new Animated.Value(0)).current;
  const s = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(s, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [o, s]);
  return (
    <Animated.View style={{ opacity: o, transform: [{ scale: s }], alignItems: "center", marginBottom: 32 }}>
      <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Sorteio concluído</Text>
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 34, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center", lineHeight: 34 }}>
        Chaveamento{"\n"}gerado
      </Text>
      <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center", marginTop: 8 }}>
        Os confrontos foram sorteados. Boa sorte!
      </Text>
    </Animated.View>
  );
}

/* ---------------- Team side ---------------- */
function TeamSide({ team, tx }: { team: { name: string; avatarUrl?: string | null } | null; tx: Animated.Value }) {
  const C = useScreenColors();
  const name = team?.name ?? "A definir";
  return (
    <Animated.View style={{ flex: 1, alignItems: "center", transform: [{ translateX: tx }] }}>
      {team?.avatarUrl ? (
        <Image source={{ uri: team.avatarUrl }} style={{ width: 46, height: 46, borderRadius: 14, marginBottom: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center", marginBottom: 7 }}>
          <Text style={{ color: team ? C.lime : C.tx3, fontFamily: "Oswald_700Bold", fontSize: 15 }}>{getInitials(name)}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={{ color: team ? C.tx : C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center", maxWidth: 100 }}>
        {name}
      </Text>
    </Animated.View>
  );
}

/* ---------------- Match card (immersive reveal) ---------------- */
function RevealMatchCard({ teamA, teamB, label, index, isFinal }: {
  teamA: { name: string; avatarUrl?: string | null } | null;
  teamB: { name: string; avatarUrl?: string | null } | null;
  label?: string;
  index: number;
  isFinal?: boolean;
}) {
  const C = useScreenColors();
  const o = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(30)).current;
  const ax = useRef(new Animated.Value(-26)).current;
  const bx = useRef(new Animated.Value(26)).current;
  const vs = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 550 + index * 190;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(o, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ax, { toValue: 0, duration: 480, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(bx, { toValue: 0, duration: 480, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(vs, { toValue: 1, friction: 5, tension: 130, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 110, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 340, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [o, ty, ax, bx, vs, flash, index]);

  return (
    <Animated.View style={{ opacity: o, transform: [{ translateY: ty }], marginBottom: 12 }}>
      <View style={{
        backgroundColor: C.card,
        borderWidth: isFinal ? 1.5 : 1,
        borderColor: isFinal ? "rgba(198,248,42,0.5)" : C.cardBorder,
        borderRadius: 18, padding: 14, paddingHorizontal: 16,
        overflow: "hidden",
      }}>
        {label ? (
          <View style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: isFinal ? C.lime : "rgba(124,58,237,0.2)", borderRadius: 20, marginBottom: 12 }}>
            {isFinal && <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={C.limeInk} strokeWidth={2.4}><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" /></Svg>}
            <Text style={{ color: isFinal ? C.limeInk : "#B79BFF", fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 1 }}>{label}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TeamSide team={teamA} tx={ax} />

          {/* VS */}
          <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", marginHorizontal: 6 }}>
            <Animated.View style={{ position: "absolute", width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: C.lime, opacity: flash, transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }] }} />
            <Animated.View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: isFinal ? C.lime : C.purple, alignItems: "center", justifyContent: "center", transform: [{ scale: vs }] }}>
              <Text style={{ color: isFinal ? C.limeInk : C.onAccent, fontFamily: "Anton_400Regular", fontSize: 14, letterSpacing: 0.5 }}>VS</Text>
            </Animated.View>
          </View>

          <TeamSide team={teamB} tx={bx} />
        </View>
      </View>
    </Animated.View>
  );
}

/* ---------------- Group composition card (round-robin / groups formats) ---------------- */
function GroupRevealCard({ label, teams, index }: {
  label: string;
  teams: { id: string; name: string; avatarUrl?: string | null }[];
  index: number;
}) {
  const C = useScreenColors();
  const o = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = 550 + index * 160;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(o, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [o, ty, index]);

  return (
    <Animated.View style={{ opacity: o, transform: [{ translateY: ty }], marginBottom: 12 }}>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: C.lime }} />
          <Text style={{ color: C.isDark ? C.lime : C.purple, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</Text>
        </View>
        <View style={{ gap: 10 }}>
          {teams.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {t.avatarUrl ? (
                <Image source={{ uri: t.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 10 }} />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 11 }}>{getInitials(t.name)}</Text>
                </View>
              )}
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{t.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function ConnectorLine({ index }: { index: number }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 300, delay: 450 + index * 190, useNativeDriver: true }).start();
  }, [o, index]);
  return (
    <Animated.View style={{ opacity: o, alignItems: "center", marginTop: -12 }}>
      <View style={{ width: 2, height: 22, backgroundColor: "rgba(198,248,42,0.25)", borderRadius: 1 }} />
    </Animated.View>
  );
}

export function BracketRevealScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const tournamentId = route?.params?.tournamentId;

  const { data: brackets, loading, refetch } = useApi(() => tournamentsService.getBracket(tournamentId), [tournamentId]);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  // Group / round-robin formats don't have a single "first match" reveal moment —
  // every team already knows it plays everyone in its group. Show group
  // composition instead of grabbing round===1 (which, for these formats, is
  // just the first pairing of each group and hides the rest of the schedule).
  const groupSections: { label: string; teams: { id: string; name: string; avatarUrl?: string | null }[] }[] = [];
  const eliminationMatches: any[] = [];

  for (const b of brackets ?? []) {
    if (b.type === "GROUPS_THEN_ELIMINATION") {
      const groupsMap = new Map<number, Map<string, any>>();
      for (const m of b.matches ?? []) {
        if (m.group === null || m.group === undefined) continue;
        if (!groupsMap.has(m.group)) groupsMap.set(m.group, new Map());
        const gm = groupsMap.get(m.group)!;
        if (m.teamA) gm.set(m.teamA.id, m.teamA);
        if (m.teamB) gm.set(m.teamB.id, m.teamB);
      }
      [...groupsMap.entries()].sort((a, b2) => a[0] - b2[0]).forEach(([gIdx, teamsMap]) => {
        groupSections.push({ label: `Grupo ${String.fromCharCode(65 + gIdx)}`, teams: [...teamsMap.values()] });
      });
    } else if (b.type === "ROUND_ROBIN") {
      const teamsMap = new Map<string, any>();
      for (const m of b.matches ?? []) {
        if (m.teamA) teamsMap.set(m.teamA.id, m.teamA);
        if (m.teamB) teamsMap.set(m.teamB.id, m.teamB);
      }
      groupSections.push({ label: "Todos contra todos", teams: [...teamsMap.values()] });
    } else {
      eliminationMatches.push(...(b.matches ?? []));
    }
  }

  const round1Matches = eliminationMatches.filter((m: any) => m.round === 1).sort((a: any, b: any) => a.position - b.position);
  const finalMatch = eliminationMatches.find((m: any) => m.label === "FINAL" || m.label === "GRAND_FINAL");
  const semiFinals = eliminationMatches.filter((m: any) => m.label === "SEMIFINAL" || m.label === "WS");

  const orderedMatches: any[] = [];
  let idx = 0;
  for (const m of round1Matches) {
    if (m.teamAId && m.teamBId) orderedMatches.push({ ...m, _idx: idx++ });
  }
  for (const m of semiFinals) orderedMatches.push({ ...m, _idx: idx++, _label: "SEMIFINAL" });
  if (finalMatch) orderedMatches.push({ ...finalMatch, _idx: idx++, _label: finalMatch.label === "GRAND_FINAL" ? "GRANDE FINAL" : "FINAL", _isFinal: true });
  if (orderedMatches.length === 0 && groupSections.length === 0 && !loading) {
    for (const m of eliminationMatches.sort((a: any, b: any) => a.round - b.round || a.position - b.position)) orderedMatches.push({ ...m, _idx: idx++ });
  }

  const getLabelText = (match: any): string | undefined => {
    if (match._label) return match._label;
    if (match.label === "FINAL") return "FINAL";
    if (match.label === "SEMIFINAL") return "SEMIFINAL";
    if (match.label === "GRAND_FINAL") return "GRANDE FINAL";
    if (match.label === "WF") return "FINAL WINNERS";
    if (match.label === "LF") return "FINAL LOSERS";
    if (match.label === "WS") return "SEMIFINAL";
    return undefined;
  };
  const isFinalMatch = (match: any) => !!match._isFinal || match.label === "FINAL" || match.label === "GRAND_FINAL";

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={C.lime} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      {/* immersive backdrop glow */}
      <LinearGradient colors={["rgba(124,58,237,0.22)", "transparent"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 30, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
          <RevealHero />

          {groupSections.map((section, i) => (
            <GroupRevealCard key={section.label} label={section.label} teams={section.teams} index={i} />
          ))}

          {orderedMatches.map((match, i) => (
            <React.Fragment key={match.id ?? i}>
              {i > 0 && !isFinalMatch(match) && <ConnectorLine index={i} />}
              <RevealMatchCard
                teamA={match.teamA}
                teamB={match.teamB}
                label={getLabelText(match)}
                index={i}
                isFinal={isFinalMatch(match)}
              />
            </React.Fragment>
          ))}
          {/* CTA at end of content */}
          <View style={{ gap: 10, marginTop: 26 }}>
            <Pressable
              onPress={() => navigation.navigate("Bracket", { tournamentId })}
              accessibilityRole="button" accessibilityLabel="Ver chaveamento completo"
              style={{ position: "relative" }}
            >
              <View style={{ width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: C.purple, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Ver chaveamento completo</Text>
                <Icon name="chevron-right" size={16} color={C.onAccent} />
              </View>
              <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
              <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("TournamentDetail", { id: tournamentId })}
              accessibilityRole="button" accessibilityLabel="Voltar ao torneio"
              style={{ width: "100%", paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>Voltar ao torneio</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
