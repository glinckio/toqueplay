import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import Svg, { Path, Circle, Rect, Polygon } from "react-native-svg";
import { matchesService, MatchDTO } from "@/services/matchesService";
import { getErrorMessage } from "@/services/api";
import { formatDate, formatTime } from "@/utils/dateFormat";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";

type RefereeStep = "loading" | "pregame" | "live" | "setEnd";

const TYPE_LABEL: Record<string, string> = { MALE: "Masculino", FEMALE: "Feminino", MIX: "Misto" };
const FORMAT_LABEL: Record<string, string> = { PAIR: "Dupla", QUARTET: "Quarteto", SEXTET: "Sexteto" };

interface TeamInfo {
  initials: string;
  name: string;
  seed: string;
  avatarUrl: string | null;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function RefereeScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const initialMatchId = route?.params?.matchId;

  const [step, setStep] = useState<RefereeStep>("loading");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [setsA, setSetsA] = useState(0);
  const [setsB, setSetsB] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [servingTeam, setServingTeam] = useState<"A" | "B">("A");
  const [setHistory, setSetHistory] = useState<{ scoreA: number; scoreB: number }[]>([]);
  const [lastSetScore, setLastSetScore] = useState({ scoreA: 0, scoreB: 0 });

  const [matchData, setMatchData] = useState<MatchDTO | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const teamA: TeamInfo = matchData
    ? { initials: matchData.teamA.initials || getInitials(matchData.teamA.name), name: matchData.teamA.name, seed: "", avatarUrl: matchData.teamA.avatarUrl ?? null }
    : { initials: "??", name: "Time A", seed: "", avatarUrl: null };
  const teamB: TeamInfo = matchData
    ? { initials: matchData.teamB.initials || getInitials(matchData.teamB.name), name: matchData.teamB.name, seed: "", avatarUrl: matchData.teamB.avatarUrl ?? null }
    : { initials: "??", name: "Time B", seed: "", avatarUrl: null };

  const accentColor = "#C6F82A";
  const primary = "#7C3AED";
  const screenBg = "#000000";
  const titleColor = "#FFFFFF";
  const metaColor = "#9A94A8";
  const labelColor = "#6E6684";
  const cardBg = "#16181C";
  const cardBorder = "rgba(255,255,255,0.07)";
  const iconBg = "rgba(124,58,237,0.16)";
  const dividerColor = "rgba(255,255,255,0.06)";
  const backBtnBg = "#16181C";
  const backBtnBorder = "rgba(255,255,255,0.07)";
  const gradientBg = ["rgba(0,0,0,0)", "#000000"] as const;
  const ctaBg = "#7C3AED";
  const ctaText = "#FFFFFF";
  const teamAGradient = ["#8B5CF6", "#6D3BEA"] as const;
  const teamBBg = "#241B38";
  const teamBText = "#CFC8E0";
  const separatorColor = "#3A3350";
  const connectedBg = "rgba(198,248,42,0.14)";
  const connectedDot = "#C6F82A";
  const connectedText = "#C6F82A";
  const warningBg = "rgba(198,248,42,0.08)";
  const warningBorder = "rgba(198,248,42,0.18)";
  const warningText = "#C6F82A";
  const warningIcon = "#C6F82A";
  const pregameCardBg = ["#16181C", "#16181C"] as const;
  const pregameVsText = "#C6F82A";
  const pregameVsBg = "rgba(255,255,255,0.06)";
  const pregameVsBorder = "rgba(255,255,255,0.1)";
  const pregameTeamName = "#FFFFFF";
  const pregameSeedText = "#9A94A8";
  const pregameTeamABg = undefined;
  const pregameTeamBBg = "#241B38";
  const pregameTeamBText = "#CFC8E0";

  // Claiming (and the out-of-order check) now happens on the shared bracket
  // screen ("Ver chaves") before navigating here — this screen just picks up
  // straight from claim: pregame if the match hasn't started, live (with
  // state restored from the server) if resuming one already in progress.
  const claimAndEnter = async (gameId: string) => {
    setClaimError(null);
    try {
      const match: any = await matchesService.claimMatch(gameId);
      setMatchData(match);
      setMatchId(match.id);

      if (match.status === "IN_PROGRESS" && Array.isArray(match.sets) && match.sets.length > 0) {
        const sets = match.sets as { setNumber: number; scoreA: number; scoreB: number }[];
        const last = sets[sets.length - 1];
        setScoreA(last.scoreA);
        setScoreB(last.scoreB);
        setSetsA(match.scoreTeamA ?? 0);
        setSetsB(match.scoreTeamB ?? 0);
        setCurrentSet(last.setNumber);
        setSetHistory(sets.slice(0, -1).map((s) => ({ scoreA: s.scoreA, scoreB: s.scoreB })));
        setStep("live");
      } else {
        setStep("pregame");
      }
    } catch (err: any) {
      setClaimError(getErrorMessage(err, "Não foi possível selecionar esta partida."));
    }
  };

  useEffect(() => {
    if (initialMatchId) claimAndEnter(initialMatchId);
    else setClaimError("Nenhuma partida selecionada.");
  }, [initialMatchId]);

  // Landscape only on the live scoring console; portrait everywhere else.
  useEffect(() => {
    ScreenOrientation.lockAsync(
      step === "live" ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {});
  }, [step]);
  useEffect(() => () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }, []);

  const handleStartMatch = async () => {
    if (matchId) {
      try {
        await matchesService.startMatch(matchId);
      } catch {}
    }
    setStep("live");
  };

  // Points are applied optimistically to local state, but a registerPoint
  // failure must NOT stay silent — otherwise the backend score quietly drifts
  // from what's on screen, and the mismatch only surfaces later as a broken
  // "finished" match (zeros, wrong winner) once finishMatch rejects.
  const warnPointNotSaved = (err: any) => {
    Alert.alert("Ponto não salvo", getErrorMessage(err, "Este ponto pode não ter sido salvo no servidor. Verifique a conexão."));
  };

  // Guards against the point buttons firing twice for a single tap (observed
  // in practice: SET_FINISH/MATCH_FINISH landing in pairs a few ms apart) —
  // a real finger can't double-tap that fast, so a short cooldown per team
  // is a safe way to swallow the duplicate without slowing down real play.
  const lastPointAt = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const POINT_DEBOUNCE_MS = 250;

  const handlePointA = async () => {
    const now = Date.now();
    if (now - lastPointAt.current.A < POINT_DEBOUNCE_MS) return;
    lastPointAt.current.A = now;
    const newScore = scoreA + 1;
    setScoreA(newScore);
    setServingTeam("A"); // rally-point rule: whoever wins the point serves next
    if (matchId) matchesService.registerPoint(matchId, { team: "A" }).catch(warnPointNotSaved);
    if (newScore >= 21 && newScore - scoreB >= 2) {
      setLastSetScore({ scoreA: newScore, scoreB });
      const newSetsA = setsA + 1;
      setSetsA(newSetsA);
      setSetHistory([...setHistory, { scoreA: newScore, scoreB }]);
      if (matchId) matchesService.finishSet(matchId, { setNumber: currentSet }).catch(warnPointNotSaved);
      setStep("setEnd");
    }
  };

  const handlePointB = async () => {
    const now = Date.now();
    if (now - lastPointAt.current.B < POINT_DEBOUNCE_MS) return;
    lastPointAt.current.B = now;
    const newScore = scoreB + 1;
    setScoreB(newScore);
    setServingTeam("B"); // rally-point rule: whoever wins the point serves next
    if (matchId) matchesService.registerPoint(matchId, { team: "B" }).catch(warnPointNotSaved);
    if (newScore >= 21 && newScore - scoreA >= 2) {
      setLastSetScore({ scoreA, scoreB: newScore });
      const newSetsB = setsB + 1;
      setSetsB(newSetsB);
      setSetHistory([...setHistory, { scoreA, scoreB: newScore }]);
      if (matchId) matchesService.finishSet(matchId, { setNumber: currentSet }).catch(warnPointNotSaved);
      setStep("setEnd");
    }
  };

  const handleUndo = () => {
    if (scoreA === 0 && scoreB === 0) return;
    const team = scoreA > scoreB ? "A" : scoreB > 0 ? "B" : "A";
    if (team === "A") setScoreA(scoreA - 1);
    else setScoreB(scoreB - 1);
    if (matchId) matchesService.removePoint(matchId, { team }).catch(() => {});
  };

  const handleToggleServe = () => setServingTeam(servingTeam === "A" ? "B" : "A");

  const [timeoutDialogVisible, setTimeoutDialogVisible] = useState(false);
  const [timeoutTeam, setTimeoutTeam] = useState<"A" | "B" | null>(null);

  const handleTimeout = () => {
    setTimeoutTeam(null);
    setTimeoutDialogVisible(true);
  };

  const [activeTimeoutTeam, setActiveTimeoutTeam] = useState<"A" | "B" | null>(null);
  const [timeoutSecondsLeft, setTimeoutSecondsLeft] = useState(60);

  const confirmTimeout = () => {
    if (!timeoutTeam) return;
    if (matchId) matchesService.registerTimeout(matchId, { team: timeoutTeam }).catch(() => {});
    setTimeoutDialogVisible(false);
    setActiveTimeoutTeam(timeoutTeam);
    setTimeoutSecondsLeft(60);
  };

  useEffect(() => {
    if (!activeTimeoutTeam) return;
    if (timeoutSecondsLeft <= 0) {
      setActiveTimeoutTeam(null);
      return;
    }
    const id = setTimeout(() => setTimeoutSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [activeTimeoutTeam, timeoutSecondsLeft]);

  const handleHistory = () => {
    const lines = setHistory.map((s, i) => `Set ${i + 1}:  ${s.scoreA} — ${s.scoreB}`);
    lines.push(`Set ${currentSet} (atual):  ${scoreA} — ${scoreB}`);
    Alert.alert(`Histórico · Sets ${setsA}—${setsB}`, lines.join("\n"));
  };

  const handleStartNextSet = () => {
    setScoreA(0);
    setScoreB(0);
    setCurrentSet(currentSet + 1);
    setStep("live");
  };

  const [finishingMatch, setFinishingMatch] = useState(false);
  // `finishingMatch` state isn't enough on its own: React batches/delays the
  // re-render, so a near-simultaneous double-fire of onPress can have BOTH
  // calls read the stale `false` before either commit. A ref is synchronous —
  // set it before anything else can interleave.
  const finishInFlight = useRef(false);

  const handleFinishMatch = async () => {
    if (finishInFlight.current) return;
    finishInFlight.current = true;
    const finishedMatchId = matchId;
    if (!finishedMatchId) { finishInFlight.current = false; return; }
    setFinishingMatch(true);
    try {
      await matchesService.finishMatch(finishedMatchId);
    } catch (err: any) {
      // MATCH_NOT_IN_PROGRESS means a duplicate tap already finished it (or
      // it was finished elsewhere) — the match IS done, so proceed to the
      // result screen instead of blocking the referee with a false error.
      if (err?.response?.data?.code !== "MATCH_NOT_IN_PROGRESS") {
        setFinishingMatch(false);
        finishInFlight.current = false;
        // Don't navigate to MatchResult on any other failure — that screen
        // would show a fabricated "finished" state (zeros, wrong winner) for
        // a match that's genuinely still IN_PROGRESS on the server.
        Alert.alert("Erro ao encerrar partida", getErrorMessage(err, "Não foi possível encerrar a partida. Tente novamente."));
        return;
      }
    }
    setFinishingMatch(false);
    // This screen's one job was this match — push the result on top and
    // leave it be. "Voltar ao chaveamento" from there goes to the shared
    // bracket/standings screen ("Ver chaves"), not back through here.
    navigation?.navigate("MatchResult", { matchId: finishedMatchId ?? "mock-match-1" });
  };

  const bestOfSets = (matchData as any)?.bestOfSets ?? 3;
  const setsToWin = Math.ceil(bestOfSets / 2);
  const matchWon = setsA >= setsToWin || setsB >= setsToWin;

  const renderBackButton = (onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: backBtnBg, borderWidth: 1, borderColor: backBtnBorder,
        alignItems: "center", justifyContent: "center",
        ...(isDark ? {} : { shadowColor: "#1A1030", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 5, elevation: 4 }),
      }}
      accessibilityLabel="Voltar"
    >
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <Path d="m15 6-6 6 6 6" stroke={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
      </Svg>
    </Pressable>
  );

  const renderTeamAvatar = (initials: string, isTeamA: boolean, size: number, avatarUrl?: string | null) => {
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size * 0.31 }} />;
    }
    if (isTeamA) {
      return (
        <LinearGradient
          colors={[...teamAGradient]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ width: size, height: size, borderRadius: size * 0.31, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: size * 0.31 }}>{initials}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: teamBBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: teamBText, fontFamily: "Oswald_700Bold", fontSize: size * 0.31 }}>{initials}</Text>
      </View>
    );
  };

  // ─── STEP 1: CLAIMING (loading / error) ───
  if (step === "loading") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {claimError ? (
          <>
            <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              {claimError}
            </Text>
            <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button">
              <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Voltar</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator size="large" color={accentColor} />
        )}
      </SafeAreaView>
    );
  }

  // ─── STEP 2: PRE-GAME ───
  if (step === "pregame") {
    const tName = matchData?.tournamentName || "";
    const md = matchData as any;
    const matchCategory = md?.bracket?.category;
    const category = matchCategory
      ? [TYPE_LABEL[matchCategory.type], FORMAT_LABEL[matchCategory.format]].filter(Boolean).join(" · ")
      : "";
    const bestOf = md?.bestOfSets;
    const format = matchData?.format || (bestOf ? `Melhor de ${bestOf}` : "");
    // Bracket matches aren't pre-scheduled to a fixed time — the referee starts
    // them whenever they're ready, so show "now" as the expected kickoff
    // instead of a blank "--:--" (the real time gets saved as `startedAt` the
    // moment the match is actually started, further down this flow).
    const scheduledAt = matchData?.scheduledAt ? new Date(matchData.scheduledAt) : new Date();
    const dateStr = formatDate(scheduledAt, { day: "2-digit", month: "2-digit" });
    const timeStr = formatTime(scheduledAt);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 30 }}>
            {renderBackButton(() => navigation?.goBack())}
            <View style={{ flex: 1 }}>
              <Text style={{ color: titleColor, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>Pré-jogo</Text>
              {tName ? <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{tName}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: connectedBg, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connectedDot }} />
              <Text style={{ color: connectedText, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 0.4 }}>CONECTADO</Text>
            </View>
          </View>

          {/* Matchup Card */}
          <LinearGradient
            colors={[...pregameCardBg]}
            start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={{ borderRadius: 22, padding: 22, marginBottom: 20, ...(isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,.08)" } : { shadowColor: "#7C3AED", shadowOpacity: 0.6, shadowOffset: { width: 0, height: 16 }, shadowRadius: 15, elevation: 10 }) }}
          >
            <Text style={{ color: isDark ? "#6E6684" : "rgba(255,255,255,.6)", fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 14 }}>CONFRONTO</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                {isDark ? renderTeamAvatar(teamA.initials, true, 52, teamA.avatarUrl) : (
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: pregameTeamABg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 18 }}>{teamA.initials}</Text>
                  </View>
                )}
                <Text style={{ color: pregameTeamName, fontFamily: "Manrope_700Bold", fontSize: 14, marginTop: 8 }}>{teamA.name}</Text>
                {teamA.seed ? <Text style={{ color: pregameSeedText, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>{teamA.seed}</Text> : null}
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ backgroundColor: pregameVsBg, borderWidth: isDark ? 1 : 0, borderColor: pregameVsBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}>
                  <Text style={{ color: pregameVsText, fontFamily: "Anton_400Regular", fontSize: 13 }}>VS</Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                {isDark ? renderTeamAvatar(teamB.initials, false, 52, teamB.avatarUrl) : (
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: pregameTeamBBg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: pregameTeamBText, fontFamily: "Oswald_700Bold", fontSize: 18 }}>{teamB.initials}</Text>
                  </View>
                )}
                <Text style={{ color: pregameTeamName, fontFamily: "Manrope_700Bold", fontSize: 14, marginTop: 8 }}>{teamB.name}</Text>
                {teamB.seed ? <Text style={{ color: pregameSeedText, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>{teamB.seed}</Text> : null}
              </View>
            </View>
          </LinearGradient>

          {/* Info rows */}
          {tName ? renderInfoRow("Torneio", tName,
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M6 9V2h12v7a6 6 0 01-12 0z" stroke="#8B5CF6" strokeWidth={2} /><Path d="M9 21h6M12 15v6" stroke="#8B5CF6" strokeWidth={2} /></Svg>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            {renderInfoRowSmall("Data", dateStr,
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Rect x={3} y={4} width={18} height={17} rx={3} stroke="#8B5CF6" strokeWidth={2} fill="none" /><Path d="M3 9h18M8 2v4M16 2v4" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
            {renderInfoRowSmall("Horário", timeStr || "--:--",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 6v6l4 2" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {renderInfoRowSmall("Categoria", category || "—",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={3} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
            {renderInfoRowSmall("Formato", format || "Melhor de 3",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#8B5CF6" strokeWidth={2} /><Path d="M4 22v-7" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
          </View>

          {/* Warning banner */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: warningBg, borderWidth: 1, borderColor: warningBorder,
            paddingVertical: 12, paddingHorizontal: 15, borderRadius: 14,
          }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={9} stroke={warningIcon} strokeWidth={2} />
              <Path d="M12 8v5M12 16.5h.01" stroke={warningIcon} strokeWidth={2} />
            </Svg>
            <Text style={{ flex: 1, color: warningText, fontFamily: "Manrope_500Medium", fontSize: 12, lineHeight: 16.8 }}>
              Ao iniciar, o placar será transmitido em tempo real para os times e espectadores.
            </Text>
          </View>
        </ScrollView>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <LinearGradient colors={[...gradientBg]} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 26 }}>
            <Pressable
              onPress={handleStartMatch}
              style={{
                backgroundColor: ctaBg, paddingVertical: 17, borderRadius: 18,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOpacity: 0.7, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12, elevation: 8 }),
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Polygon points="5,3 19,12 5,21" stroke={ctaText} strokeWidth={2.4} fill="none" />
              </Svg>
              <Text style={{ color: ctaText, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Iniciar partida
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // ─── STEP 5: SET END ───
  if (step === "setEnd") {
    const winnerIsA = lastSetScore.scoreA > lastSetScore.scoreB;
    const winnerName = winnerIsA ? teamA.name : teamB.name;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 46, alignItems: "center", paddingBottom: 120 }}>
          {/* Checkmark icon */}
          <View style={{
            width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 22,
            ...(isDark
              ? { backgroundColor: "rgba(198,248,42,.14)", borderWidth: 1, borderColor: "rgba(198,248,42,.3)" }
              : { backgroundColor: accentColor, shadowColor: "#7C3AED", shadowOpacity: 0.7, shadowOffset: { width: 0, height: 18 }, shadowRadius: 18, elevation: 10 }),
          }}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
              <Path d="m5 13 4 4 10-11" stroke={isDark ? "#C6F82A" : "#FFFFFF"} strokeWidth={2.2} />
            </Svg>
          </View>

          <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>
            SET {currentSet} ENCERRADO
          </Text>
          <Text style={{ color: titleColor, fontFamily: "Anton_400Regular", fontSize: 36, letterSpacing: 0.4, marginBottom: 6 }}>
            {lastSetScore.scoreA} — {lastSetScore.scoreB}
          </Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 28 }}>
            {winnerName} vence o set
          </Text>

          {/* Set-by-set card */}
          <View style={{
            borderRadius: 22, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
            padding: 18, width: "100%", marginBottom: 22,
            ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 13, elevation: 6 }),
          }}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 14 }}>PLACAR POR SET</Text>

            {/* Team A row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {renderTeamAvatar(teamA.initials, true, 34, teamA.avatarUrl)}
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{teamA.name}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: accentColor, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: isDark ? "#12100A" : "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 13 }}>{setsA}</Text>
                </View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>sets</Text>
              </View>
            </View>

            {/* Team B row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {renderTeamAvatar(teamB.initials, false, 34, teamB.avatarUrl)}
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{teamB.name}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? "#2A2340" : "#E4DEF2", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "Anton_400Regular", fontSize: 13 }}>{setsB}</Text>
                </View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>sets</Text>
              </View>
            </View>

            {/* Set scores */}
            <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: dividerColor }}>
              {Array.from({ length: bestOfSets }, (_, i) => i + 1).map((setNum) => {
                const setData = setHistory[setNum - 1];
                return (
                  <View key={setNum} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                    <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>Set {setNum}</Text>
                    {setData ? (
                      <Text style={{ fontFamily: "Anton_400Regular", fontSize: 14 }}>
                        <Text style={{ color: setData.scoreA > setData.scoreB ? accentColor : titleColor }}>{setData.scoreA}</Text>
                        <Text style={{ color: titleColor }}> — {setData.scoreB}</Text>
                      </Text>
                    ) : (
                      <Text style={{ color: isDark ? "#3A3350" : "#DFD7EE", fontFamily: "Anton_400Regular", fontSize: 14 }}>— : —</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Match point banner */}
          {!matchWon && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              backgroundColor: warningBg, borderWidth: 1, borderColor: warningBorder,
              paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, width: "100%",
            }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M6 9V2h12v7a6 6 0 01-12 0z" stroke={accentColor} strokeWidth={2} />
                <Path d="M9 21h6M12 15v6" stroke={accentColor} strokeWidth={2} />
              </Svg>
              <View>
                <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 13 }}>Match point!</Text>
                <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, lineHeight: 15.4, marginTop: 2 }}>
                  {setsA > setsB ? teamA.name : teamB.name} precisa de mais 1 set para vencer a partida.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <LinearGradient colors={[...gradientBg]} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 26 }}>
            <Pressable
              onPress={matchWon ? handleFinishMatch : handleStartNextSet}
              disabled={finishingMatch}
              style={{
                backgroundColor: ctaBg, paddingVertical: 17, borderRadius: 18,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: finishingMatch ? 0.6 : 1,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOpacity: 0.7, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12, elevation: 8 }),
              }}
            >
              {finishingMatch ? (
                <ActivityIndicator size="small" color={ctaText} />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Polygon points="5,3 19,12 5,21" stroke={ctaText} strokeWidth={2.4} fill="none" />
                </Svg>
              )}
              <Text style={{ color: ctaText, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {matchWon ? "Ver resultado" : `Iniciar set ${currentSet + 1}`}
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // ─── STEP 4: LIVE SCORING (landscape) ───
  const ActionBtn = ({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) => (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ flex: 1, alignItems: "center", gap: 3, backgroundColor: "#16181C", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingVertical: 8 }}>
      {children}
      <Text style={{ color: "#9A94A8", fontFamily: "Oswald_500Medium", fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000000", flexDirection: "row" }}>
      <StatusBar hidden />

      {/* Corner back button */}
      <Pressable
        onPress={() => {
          Alert.alert("Sair da partida?", "Você pode retomar depois pela lista de partidas.", [
            { text: "Continuar apitando", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => navigation?.goBack() },
          ]);
        }}
        accessibilityLabel="Voltar"
        style={{ position: "absolute", top: 14, left: 14, zIndex: 20, width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
      >
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Path d="m15 6-6 6 6 6" stroke="#FFFFFF" strokeWidth={2.2} /></Svg>
      </Pressable>

      {/* Team A — tap anywhere to score */}
      <Pressable onPress={handlePointA} accessibilityLabel={`Ponto ${teamA.name}`} style={{ flex: 1, backgroundColor: "#17122A", alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 22, alignItems: "center" }}>
          {renderTeamAvatar(teamA.initials, true, 40, teamA.avatarUrl)}
          <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 6, maxWidth: 160, textAlign: "center" }}>{teamA.name}</Text>
          {servingTeam === "A" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: accentColor, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#12100A" }} />
              <Text style={{ color: "#12100A", fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>SAQUE</Text>
            </View>
          )}
        </View>
        <Text style={{ color: accentColor, fontFamily: "Anton_400Regular", fontSize: 130, lineHeight: 130, letterSpacing: 1 }}>{scoreA}</Text>
        <Text style={{ position: "absolute", bottom: 16, color: "rgba(255,255,255,0.3)", fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Toque para +1</Text>
      </Pressable>

      {/* Center control column */}
      <View style={{ width: 200, backgroundColor: "#0A0A0C", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16 }}>
        {/* top: AO VIVO */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,77,94,0.16)", paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF4D5E" }} />
          <Text style={{ color: "#FF4D5E", fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 1 }}>AO VIVO</Text>
        </View>

        {/* middle: set + big sets tally */}
        <View style={{ alignItems: "center", gap: 10 }}>
          <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.6, textTransform: "uppercase" }}>Set {currentSet}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#241B38", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: accentColor, fontFamily: "Anton_400Regular", fontSize: 34 }}>{setsA}</Text>
            </View>
            <Text style={{ color: "#3A3350", fontFamily: "Anton_400Regular", fontSize: 18 }}>×</Text>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#16181C", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 34 }}>{setsB}</Text>
            </View>
          </View>
          <Text style={{ color: "#6E6684", fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" }}>Sets vencidos</Text>
          {setHistory.length > 0 && (
            <Text numberOfLines={1} style={{ color: "#6E6684", fontFamily: "Manrope_500Medium", fontSize: 10.5 }}>
              {setHistory.map((s) => `${s.scoreA}-${s.scoreB}`).join(" · ")}
            </Text>
          )}
        </View>

        {/* bottom: big actions */}
        <View style={{ width: "100%", gap: 10 }}>
          <Pressable onPress={handleUndo} accessibilityLabel="Desfazer último ponto" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(124,58,237,0.16)", borderWidth: 1, borderColor: "rgba(139,92,246,0.35)", borderRadius: 14, paddingVertical: 15 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M3 10h13a4 4 0 010 8H9" stroke="#FFFFFF" strokeWidth={2.2} /><Path d="m7 14-4-4 4-4" stroke="#FFFFFF" strokeWidth={2.2} /></Svg>
            <Text style={{ color: "#FFFFFF", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }}>Desfazer</Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={handleToggleServe} accessibilityLabel="Trocar saque" style={{ flex: 1, alignItems: "center", gap: 5, backgroundColor: "#16181C", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 14 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 8v4l2 2" stroke="#8B5CF6" strokeWidth={2} /></Svg>
              <Text style={{ color: "#9A94A8", fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>Saque</Text>
            </Pressable>
            <Pressable onPress={handleTimeout} accessibilityLabel="Timeout" style={{ flex: 1, alignItems: "center", gap: 5, backgroundColor: "#16181C", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 14 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M10 2h4v7l3-2v10l-3-2v7h-4z" stroke="#FFC14D" strokeWidth={2} /></Svg>
              <Text style={{ color: "#9A94A8", fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>Timeout</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Team B — tap anywhere to score */}
      <Pressable onPress={handlePointB} accessibilityLabel={`Ponto ${teamB.name}`} style={{ flex: 1, backgroundColor: "#0F0F13", alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 22, alignItems: "center" }}>
          {renderTeamAvatar(teamB.initials, false, 40, teamB.avatarUrl)}
          <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 6, maxWidth: 160, textAlign: "center" }}>{teamB.name}</Text>
          {servingTeam === "B" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: accentColor, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#12100A" }} />
              <Text style={{ color: "#12100A", fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>SAQUE</Text>
            </View>
          )}
        </View>
        <Text style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 130, lineHeight: 130, letterSpacing: 1 }}>{scoreB}</Text>
        <Text style={{ position: "absolute", bottom: 16, color: "rgba(255,255,255,0.3)", fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Toque para +1</Text>
      </Pressable>

      <ConfirmDialog
        visible={timeoutDialogVisible}
        title="Timeout"
        cancelLabel="Cancelar"
        actionLabel="Confirmar"
        onCancel={() => setTimeoutDialogVisible(false)}
        onConfirm={confirmTimeout}
      >
        <Text style={{ color: "#9A94A8", fontFamily: "Manrope_500Medium", fontSize: 13.5, marginBottom: 14 }}>
          Qual time pediu timeout?
        </Text>
        {[{ team: "A" as const, name: teamA.name }, { team: "B" as const, name: teamB.name }].map((t) => (
          <Pressable
            key={t.team}
            onPress={() => setTimeoutTeam(t.team)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 8,
              borderWidth: 1.5, borderColor: timeoutTeam === t.team ? "#7C3AED" : "rgba(255,255,255,0.1)",
              backgroundColor: timeoutTeam === t.team ? "rgba(124,58,237,0.14)" : "transparent",
            }}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 9, borderWidth: 2,
              borderColor: timeoutTeam === t.team ? "#7C3AED" : "rgba(255,255,255,0.3)",
              alignItems: "center", justifyContent: "center",
            }}>
              {timeoutTeam === t.team && <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#7C3AED" }} />}
            </View>
            <Text style={{ color: "#FFFFFF", fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>{t.name}</Text>
          </Pressable>
        ))}
      </ConfirmDialog>

      {activeTimeoutTeam && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: "#FFC14D", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 2, marginBottom: 10 }}>TIMEOUT</Text>
          <Text style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 24 }}>
            {activeTimeoutTeam === "A" ? teamA.name : teamB.name}
          </Text>
          <View style={{
            width: 180, height: 180, borderRadius: 90, borderWidth: 4, borderColor: "#7C3AED",
            alignItems: "center", justifyContent: "center", marginBottom: 28,
          }}>
            <Text style={{ color: "#C6F82A", fontFamily: "Anton_400Regular", fontSize: 72, lineHeight: 76 }}>{timeoutSecondsLeft}</Text>
          </View>
          <Pressable
            onPress={() => setActiveTimeoutTeam(null)}
            style={{ paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
            accessibilityLabel="Encerrar timeout"
          >
            <Text style={{ color: "#9A94A8", fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Encerrar agora</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  function renderInfoRow(label: string, value: string, icon: React.ReactNode) {
    return (
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 13,
        backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
        borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
        ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 4 }),
      }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{label}</Text>
          <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>{value}</Text>
        </View>
      </View>
    );
  }

  function renderInfoRowSmall(label: string, value: string, icon: React.ReactNode) {
    return (
      <View style={{
        flex: 1, flexDirection: "row", alignItems: "center", gap: 11,
        backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
        borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
        ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 4 }),
      }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{label}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{value}</Text>
        </View>
      </View>
    );
  }
}
