import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import Svg, { Path, Circle, Rect, Polyline, Polygon, Line } from "react-native-svg";
import { matchesService, MatchDTO } from "@/services/matchesService";

type RefereeStep = "code" | "pregame" | "live" | "setEnd";

interface TeamInfo {
  initials: string;
  name: string;
  seed: string;
}

const TEAM_A: TeamInfo = { initials: "SR", name: "Silva & Rocha", seed: "Seed #1" };
const TEAM_B: TeamInfo = { initials: "PA", name: "Praia Aces", seed: "Seed #4" };

export function RefereeScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<RefereeStep>("code");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
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
  const [enteringCode, setEnteringCode] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const teamA: TeamInfo = matchData
    ? { initials: matchData.teamA.initials || matchData.teamA.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), name: matchData.teamA.name, seed: "" }
    : TEAM_A;
  const teamB: TeamInfo = matchData
    ? { initials: matchData.teamB.initials || matchData.teamB.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), name: matchData.teamB.name, seed: "" }
    : TEAM_B;

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const iconBg = isDark ? "#1C1630" : "#F0ECFA";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const backBtnBg = isDark ? "#171320" : "#FFFFFF";
  const backBtnBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)";
  const gradientBg = isDark
    ? ["rgba(12,10,18,0)", "#0C0A12"] as const
    : ["rgba(247,245,252,0)", "#F7F5FC"] as const;
  const ctaBg = isDark ? "#C6F82A" : "#7C3AED";
  const ctaText = isDark ? "#12100A" : "#FFFFFF";
  const teamAGradient = ["#8B5CF6", "#6D3BEA"] as const;
  const teamBBg = isDark ? "#221B33" : "#F0ECFA";
  const teamBText = isDark ? "#CFC8E0" : "#7C3AED";
  const separatorColor = isDark ? "#3A3350" : "#DFD7EE";
  const connectedBg = isDark ? "rgba(198,248,42,.14)" : "rgba(92,122,0,.12)";
  const connectedDot = isDark ? "#C6F82A" : "#5C7A00";
  const connectedText = isDark ? "#C6F82A" : "#5C7A00";
  const warningBg = isDark ? "rgba(198,248,42,.08)" : "rgba(124,58,237,.07)";
  const warningBorder = isDark ? "rgba(198,248,42,.18)" : "rgba(124,58,237,.15)";
  const warningText = isDark ? "#C6F82A" : "#6B6480";
  const warningIcon = isDark ? "#C6F82A" : "#7C3AED";
  const pregameCardBg = isDark ? ["#1B1530", "#120E1D"] as const : ["#7C3AED", "#5B2BC4"] as const;
  const pregameVsText = isDark ? "#6E6684" : "rgba(255,255,255,.6)";
  const pregameVsBg = isDark ? "#1A1530" : "rgba(255,255,255,.12)";
  const pregameVsBorder = isDark ? "rgba(255,255,255,.08)" : "transparent";
  const pregameTeamName = isDark ? "#F5F3FA" : "#FFFFFF";
  const pregameSeedText = isDark ? "#948CA8" : "rgba(255,255,255,.7)";
  const pregameTeamABg = isDark ? undefined : "rgba(255,255,255,.2)";
  const pregameTeamBBg = isDark ? "#221B33" : "rgba(255,255,255,.15)";
  const pregameTeamBText = isDark ? "#CFC8E0" : "#FFFFFF";

  const codeComplete = code.every((d) => d !== "");

  const handleCodeInput = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleEnterMatch = async () => {
    if (!codeComplete) return;
    setEnteringCode(true);
    try {
      const fullCode = code.join("");
      const match = await matchesService.refereeEnter(fullCode);
      setMatchData(match);
      setMatchId(match.id);
      setStep("pregame");
    } catch (err: any) {
      Alert.alert("Código inválido", err?.response?.data?.message || "Não foi possível entrar na partida.");
    } finally {
      setEnteringCode(false);
    }
  };

  const handleStartMatch = async () => {
    if (matchId) {
      try {
        await matchesService.startMatch(matchId);
      } catch {}
    }
    setStep("live");
  };

  const handlePointA = async () => {
    const newScore = scoreA + 1;
    setScoreA(newScore);
    if (matchId) matchesService.registerPoint(matchId, { team: "A" }).catch(() => {});
    if (newScore >= 21 && newScore - scoreB >= 2) {
      setLastSetScore({ scoreA: newScore, scoreB });
      const newSetsA = setsA + 1;
      setSetsA(newSetsA);
      setSetHistory([...setHistory, { scoreA: newScore, scoreB }]);
      if (matchId) matchesService.finishSet(matchId, { setNumber: currentSet }).catch(() => {});
      setStep("setEnd");
    }
  };

  const handlePointB = async () => {
    const newScore = scoreB + 1;
    setScoreB(newScore);
    if (matchId) matchesService.registerPoint(matchId, { team: "B" }).catch(() => {});
    if (newScore >= 21 && newScore - scoreA >= 2) {
      setLastSetScore({ scoreA, scoreB: newScore });
      const newSetsB = setsB + 1;
      setSetsB(newSetsB);
      setSetHistory([...setHistory, { scoreA, scoreB: newScore }]);
      if (matchId) matchesService.finishSet(matchId, { setNumber: currentSet }).catch(() => {});
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

  const handleStartNextSet = () => {
    setScoreA(0);
    setScoreB(0);
    setCurrentSet(currentSet + 1);
    setStep("live");
  };

  const handleFinishMatch = async () => {
    if (matchId) {
      try { await matchesService.finishMatch(matchId); } catch {}
    }
    navigation?.navigate("MatchResult", { matchId: matchId ?? "mock-match-1" });
  };

  const matchWon = setsA >= 2 || setsB >= 2;

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

  const renderTeamAvatar = (initials: string, isTeamA: boolean, size: number) => {
    if (isTeamA) {
      return (
        <LinearGradient
          colors={[...teamAGradient]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={{ width: size, height: size, borderRadius: size * 0.31, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: size * 0.31 }}>{initials}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor: teamBBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: teamBText, fontFamily: "SpaceGrotesk_700Bold", fontSize: size * 0.31 }}>{initials}</Text>
      </View>
    );
  };

  // ─── STEP 1: CODE ENTRY ───
  if (step === "code") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 48 }}>
            {renderBackButton(() => navigation?.goBack())}
            <Text style={{ flex: 1, color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, letterSpacing: -0.2 }}>
              Entrar como árbitro
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <LinearGradient
              colors={isDark ? ["rgba(139,92,246,.22)", "rgba(198,248,42,.12)"] : ["rgba(124,58,237,.12)", "rgba(92,122,0,.1)"]}
              start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={{
                width: 80, height: 80, borderRadius: 26, alignItems: "center", justifyContent: "center",
                marginBottom: 28, borderWidth: 1, borderColor: isDark ? "rgba(139,92,246,.3)" : "rgba(124,58,237,.2)",
              }}
            >
              <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
                <Path d="M2 8a4 4 0 014-4h1a2 2 0 012 2v2a2 2 0 01-2 2H6" stroke={accentColor} strokeWidth={1.8} />
                <Path d="M6 8v9a3 3 0 003 3h6a3 3 0 003-3V8" stroke={accentColor} strokeWidth={1.8} />
                <Path d="M18 8h1a2 2 0 002-2V4a2 2 0 00-2-2h-1a4 4 0 00-4 4" stroke={accentColor} strokeWidth={1.8} />
                <Circle cx={12} cy={13} r={2} stroke={accentColor} strokeWidth={1.8} />
              </Svg>
            </LinearGradient>

            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, letterSpacing: -0.2, marginBottom: 8 }}>
              Código da partida
            </Text>
            <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19.5, maxWidth: 260, textAlign: "center", marginBottom: 32 }}>
              Insira o código de 6 dígitos fornecido pelo organizador do torneio.
            </Text>

            <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 32 }}>
              {code.map((digit, i) => (
                <View
                  key={i}
                  style={{
                    width: 46, height: 56, borderRadius: 14,
                    backgroundColor: digit ? (isDark ? "#171221" : "#FFFFFF") : (isDark ? "#141019" : "#F0ECFA"),
                    borderWidth: digit ? 1.5 : 1,
                    borderColor: digit ? (isDark ? "#8B5CF6" : "#7C3AED") : (isDark ? "rgba(255,255,255,.09)" : "rgba(26,16,48,.1)"),
                    alignItems: "center", justifyContent: "center",
                    ...(digit ? { shadowColor: isDark ? "rgba(139,92,246,.12)" : "rgba(124,58,237,.1)", shadowOpacity: 1, shadowOffset: { width: 0, height: 0 }, shadowRadius: 4 } : {}),
                  }}
                >
                  <TextInput
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    value={digit}
                    onChangeText={(t) => handleCodeInput(t, i)}
                    onKeyPress={(e) => handleCodeKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={{
                      width: "100%", height: "100%", textAlign: "center",
                      color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24,
                    }}
                    accessibilityLabel={`Dígito ${i + 1}`}
                  />
                </View>
              ))}
            </View>

            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: isDark ? "rgba(139,92,246,.12)" : "rgba(124,58,237,.08)",
              paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14,
            }}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={9} stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                <Path d="M12 8v5M12 16.5h.01" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
              </Svg>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12 }}>
                Peça o código ao organizador da partida
              </Text>
            </View>
          </View>
        </View>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <LinearGradient colors={[...gradientBg]} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 26 }}>
            <View style={{ opacity: codeComplete && !enteringCode ? 1 : 0.5 }}>
              <Pressable
                onPress={handleEnterMatch}
                disabled={!codeComplete || enteringCode}
                style={{
                  backgroundColor: ctaBg, paddingVertical: 16, borderRadius: 18,
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12, elevation: 8 }),
                }}
              >
                {enteringCode ? (
                  <ActivityIndicator size="small" color={ctaText} />
                ) : (
                  <Text style={{ color: ctaText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, letterSpacing: 0.28 }}>
                    Entrar na partida
                  </Text>
                )}
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="m9 6 6 6-6 6" stroke={ctaText} strokeWidth={2.6} />
                </Svg>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // ─── STEP 2: PRE-GAME ───
  if (step === "pregame") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 30 }}>
            {renderBackButton(() => setStep("code"))}
            <View style={{ flex: 1 }}>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, letterSpacing: -0.2 }}>Pré-jogo</Text>
              <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12 }}>Copa Verão 2026</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: connectedBg, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connectedDot }} />
              <Text style={{ color: connectedText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 0.4 }}>CONECTADO</Text>
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
                {isDark ? renderTeamAvatar(teamA.initials, true, 52) : (
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: pregameTeamABg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 }}>{teamA.initials}</Text>
                  </View>
                )}
                <Text style={{ color: pregameTeamName, fontFamily: "Manrope_700Bold", fontSize: 14, marginTop: 8 }}>{teamA.name}</Text>
                <Text style={{ color: pregameSeedText, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>{teamA.seed}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <View style={{ backgroundColor: pregameVsBg, borderWidth: isDark ? 1 : 0, borderColor: pregameVsBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}>
                  <Text style={{ color: pregameVsText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>VS</Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                {isDark ? renderTeamAvatar(teamB.initials, false, 52) : (
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: pregameTeamBBg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: pregameTeamBText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 }}>{teamB.initials}</Text>
                  </View>
                )}
                <Text style={{ color: pregameTeamName, fontFamily: "Manrope_700Bold", fontSize: 14, marginTop: 8 }}>{teamB.name}</Text>
                <Text style={{ color: pregameSeedText, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>{teamB.seed}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Info rows */}
          {renderInfoRow("Torneio", "Copa Verão 2026 · Praia Grande",
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M6 9V2h12v7a6 6 0 01-12 0z" stroke="#8B5CF6" strokeWidth={2} /><Path d="M9 21h6M12 15v6" stroke="#8B5CF6" strokeWidth={2} /></Svg>
          )}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            {renderInfoRowSmall("Data", "12/07",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Rect x={3} y={4} width={18} height={17} rx={3} stroke="#8B5CF6" strokeWidth={2} fill="none" /><Path d="M3 9h18M8 2v4M16 2v4" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
            {renderInfoRowSmall("Horário", "14:30",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 6v6l4 2" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {renderInfoRowSmall("Categoria", "Masc · Dupla",
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={3} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" stroke="#8B5CF6" strokeWidth={2} /></Svg>
            )}
            {renderInfoRowSmall("Formato", "Melhor de 3",
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
              <Text style={{ color: ctaText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, letterSpacing: 0.3 }}>
                Iniciar partida
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // ─── STEP 4: SET END ───
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

          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>
            SET {currentSet} ENCERRADO
          </Text>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 32, letterSpacing: -0.64, marginBottom: 6 }}>
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
                {renderTeamAvatar(teamA.initials, true, 34)}
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{teamA.name}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: accentColor, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: isDark ? "#12100A" : "#FFFFFF", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 }}>{setsA}</Text>
                </View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>sets</Text>
              </View>
            </View>

            {/* Team B row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {renderTeamAvatar(teamB.initials, false, 34)}
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{teamB.name}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? "#2A2340" : "#E4DEF2", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 }}>{setsB}</Text>
                </View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>sets</Text>
              </View>
            </View>

            {/* Set scores */}
            <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: dividerColor }}>
              {[1, 2, 3].map((setNum) => {
                const setData = setHistory[setNum - 1];
                return (
                  <View key={setNum} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                    <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>Set {setNum}</Text>
                    {setData ? (
                      <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>
                        <Text style={{ color: setData.scoreA > setData.scoreB ? accentColor : titleColor }}>{setData.scoreA}</Text>
                        <Text style={{ color: titleColor }}> — {setData.scoreB}</Text>
                      </Text>
                    ) : (
                      <Text style={{ color: isDark ? "#3A3350" : "#DFD7EE", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>— : —</Text>
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
                <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Match point!</Text>
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
              style={{
                backgroundColor: ctaBg, paddingVertical: 17, borderRadius: 18,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOpacity: 0.7, shadowOffset: { width: 0, height: 12 }, shadowRadius: 12, elevation: 8 }),
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Polygon points="5,3 19,12 5,21" stroke={ctaText} strokeWidth={2.4} fill="none" />
              </Svg>
              <Text style={{ color: ctaText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, letterSpacing: 0.3 }}>
                {matchWon ? "Ver resultado" : `Iniciar set ${currentSet + 1}`}
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // ─── STEP 3: LIVE SCORING ───
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 }}>
        {/* Header: AO VIVO + set info */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" }} />
            <Text style={{ color: "#EF4444", fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, letterSpacing: 0.66 }}>AO VIVO</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={9} stroke={metaColor} strokeWidth={2} />
              <Path d="M12 6v6l4 2" stroke={metaColor} strokeWidth={2} />
            </Svg>
            <Text style={{ color: metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 12 }}>SET {currentSet}</Text>
          </View>
        </View>

        <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 11, textAlign: "center", marginBottom: 10 }}>Copa Verão 2026 · Semifinal</Text>

        {/* Sets won indicator */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: accentColor, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: isDark ? "#12100A" : "#FFFFFF", fontFamily: "SpaceGrotesk_700Bold", fontSize: 10 }}>{setsA}</Text>
            </View>
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 10 }}>set</Text>
          </View>
          <Text style={{ color: isDark ? "#2A2340" : "#DFD7EE", fontFamily: "Manrope_600SemiBold", fontSize: 10 }}>—</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 10 }}>set</Text>
            <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: isDark ? "#2A2340" : "#E4DEF2", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 10 }}>{setsB}</Text>
            </View>
          </View>
        </View>

        {/* Scoreboard */}
        <LinearGradient
          colors={isDark ? ["#1B1530", "#110D1C"] : ["#FFFFFF", "#FFFFFF"]}
          start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
          style={{
            borderRadius: 24, padding: 20, marginBottom: 14,
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.08)" : "rgba(26,16,48,.07)",
            ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, elevation: 6 }),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              {renderTeamAvatar(teamA.initials, true, 48)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, marginTop: 6 }}>{teamA.name}</Text>
              {servingTeam === "A" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, backgroundColor: isDark ? "rgba(198,248,42,.14)" : "rgba(124,58,237,.1)", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 }}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={8} stroke={accentColor} strokeWidth={2.5} />
                  </Svg>
                  <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9 }}>SAQUE</Text>
                </View>
              )}
              {servingTeam !== "A" && <View style={{ height: 22, marginTop: 5 }} />}
            </View>

            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 64, lineHeight: 64, letterSpacing: -1.92 }}>{scoreA}</Text>
              <Text style={{ color: separatorColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 28 }}>:</Text>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 64, lineHeight: 64, letterSpacing: -1.92 }}>{scoreB}</Text>
            </View>

            <View style={{ flex: 1, alignItems: "center" }}>
              {renderTeamAvatar(teamB.initials, false, 48)}
              <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, marginTop: 6 }}>{teamB.name}</Text>
              {servingTeam === "B" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, backgroundColor: isDark ? "rgba(198,248,42,.14)" : "rgba(124,58,237,.1)", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 }}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={8} stroke={accentColor} strokeWidth={2.5} />
                  </Svg>
                  <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9 }}>SAQUE</Text>
                </View>
              )}
              {servingTeam !== "B" && <View style={{ height: 22, marginTop: 5 }} />}
            </View>
          </View>

          {/* Set scores */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: dividerColor }}>
            {[1, 2, 3].map((setNum) => {
              const isCurrentSet = setNum === currentSet;
              const setData = setHistory[setNum - 1];
              return (
                <React.Fragment key={setNum}>
                  {setNum > 1 && <View style={{ width: 1, backgroundColor: dividerColor }} />}
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: isCurrentSet ? accentColor : labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 9, letterSpacing: 0.72, marginBottom: 3 }}>SET {setNum}</Text>
                    {setData ? (
                      <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 14 }}>
                        <Text style={{ color: setData.scoreA > setData.scoreB ? accentColor : metaColor }}>{setData.scoreA}</Text>
                        <Text style={{ color: separatorColor }}>  :  </Text>
                        <Text style={{ color: setData.scoreB > setData.scoreA ? accentColor : metaColor }}>{setData.scoreB}</Text>
                      </Text>
                    ) : isCurrentSet ? (
                      <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, color: titleColor }}>{scoreA}<Text style={{ color: separatorColor }}>  :  </Text>{scoreB}</Text>
                    ) : (
                      <Text style={{ color: isDark ? "#3A3350" : "#DFD7EE", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14 }}>— : —</Text>
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </LinearGradient>

        {/* Point buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
          <Pressable
            onPress={handlePointA}
            style={{
              flex: 1, paddingVertical: 20, borderRadius: 18, alignItems: "center", gap: 4,
              overflow: "hidden",
            }}
            accessibilityLabel={`Ponto ${teamA.name}`}
          >
            <LinearGradient
              colors={[...teamAGradient]}
              start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: 18,
              }}
            />
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.4} />
            </Svg>
            <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 }}>PONTO {teamA.initials}</Text>
          </Pressable>

          <Pressable
            onPress={handlePointB}
            style={{
              flex: 1, paddingVertical: 20, borderRadius: 18, alignItems: "center", gap: 4,
              backgroundColor: isDark ? "#1C1630" : "#FFFFFF",
              borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
              ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 4 }),
            }}
            accessibilityLabel={`Ponto ${teamB.name}`}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={titleColor} strokeWidth={2.4} />
            </Svg>
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 }}>PONTO {teamB.initials}</Text>
          </Pressable>
        </View>

        {/* Action bar */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Timeout", icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M10 2h4v7l3-2v10l-3-2v7h-4z" stroke="#FFC14D" strokeWidth={2} /></Svg> },
            { label: "Cartão", icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Rect x={6} y={3} width={12} height={18} rx={2} stroke="#EF4444" strokeWidth={2} fill="none" /></Svg> },
            { label: "Trocar saque", icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke="#8B5CF6" strokeWidth={2} /><Path d="M12 8v4l2 2" stroke="#8B5CF6" strokeWidth={2} /></Svg>, onPress: handleToggleServe },
            { label: "Histórico", icon: <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M3 10h4l3-7 4 14 3-7h4" stroke={metaColor} strokeWidth={2} /></Svg> },
          ].map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={{
                flex: 1, alignItems: "center", gap: 5,
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 16, paddingVertical: 14,
                ...(isDark ? {} : { shadowColor: "#2E1065", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 3 }),
              }}
              accessibilityLabel={action.label}
            >
              {action.icon}
              <Text style={{ color: metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 10 }}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Undo button */}
        <Pressable
          onPress={handleUndo}
          style={{
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            paddingVertical: 13, borderRadius: 14, borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
          }}
          accessibilityLabel="Desfazer último ponto"
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M3 10h13a4 4 0 010 8H9" stroke={metaColor} strokeWidth={2.2} />
            <Path d="m7 14-4-4 4-4" stroke={metaColor} strokeWidth={2.2} />
          </Svg>
          <Text style={{ color: metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Desfazer último ponto</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
        <View>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{label}</Text>
          <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{value}</Text>
        </View>
      </View>
    );
  }
}
