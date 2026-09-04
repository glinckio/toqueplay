import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { tournamentsService } from "@/services/tournamentsService";
import { matchesService } from "@/services/matchesService";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/stores/authStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getErrorMessage } from "@/services/api";

type GameStatus = "completed" | "live" | "pending";

interface TeamScore {
  initials: string;
  name: string;
  avatarUrl: string | null;
  sets: (number | null)[];
  isWinner?: boolean;
}

interface BracketGame {
  id: string;
  round: number;
  group: number | null;
  bracketType: string;
  position: number;
  status: GameStatus;
  statusLabel: string;
  courtLabel: string;
  matchLabel: string | null;
  team1Id: string | null;
  team2Id: string | null;
  rawStatus: string;
  refereeId: string | null;
  team1: TeamScore;
  team2: TeamScore;
}

interface StandingsRow {
  teamId: string;
  name: string;
  avatarUrl: string | null;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

// Same standings rule used server-side (checkAndAdvanceGroupTeams /
// checkAndAdvanceRoundRobinTeams): wins first, then point-saldo, then
// raw points-for as the final tiebreak.
function computeStandings(games: BracketGame[]): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  for (const g of games) {
    if (!g.team1Id || !g.team2Id) continue;
    if (g.status !== "completed") continue;

    if (!rows.has(g.team1Id)) rows.set(g.team1Id, { teamId: g.team1Id, name: g.team1.name, avatarUrl: g.team1.avatarUrl, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    if (!rows.has(g.team2Id)) rows.set(g.team2Id, { teamId: g.team2Id, name: g.team2.name, avatarUrl: g.team2.avatarUrl, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });

    const r1 = rows.get(g.team1Id)!;
    const r2 = rows.get(g.team2Id)!;
    r1.played++; r2.played++;

    for (let i = 0; i < g.team1.sets.length; i++) {
      const a = g.team1.sets[i], b = g.team2.sets[i];
      if (a == null || b == null) continue;
      r1.pointsFor += a; r1.pointsAgainst += b;
      r2.pointsFor += b; r2.pointsAgainst += a;
    }

    if (g.team1.isWinner) { r1.wins++; r2.losses++; }
    else if (g.team2.isWinner) { r2.wins++; r1.losses++; }
  }

  return [...rows.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const saldoA = a.pointsFor - a.pointsAgainst;
    const saldoB = b.pointsFor - b.pointsAgainst;
    if (saldoB !== saldoA) return saldoB - saldoA;
    return b.pointsFor - a.pointsFor;
  });
}

interface StandingsSection {
  label: string;
  rows: StandingsRow[];
}

function buildStandingsSections(games: BracketGame[]): StandingsSection[] {
  const isGroupsType = games.some((g) => g.bracketType === "GROUPS_THEN_ELIMINATION");
  if (isGroupsType) {
    const groupIdxs = [...new Set(games.filter((g) => g.group !== null).map((g) => g.group as number))].sort((a, b) => a - b);
    return groupIdxs.map((gi) => ({
      label: `Grupo ${groupLetter(gi)}`,
      rows: computeStandings(games.filter((g) => g.group === gi)),
    }));
  }
  // ROUND_ROBIN: exclude any playoff/elimination matches (label set), only
  // the round-robin phase counts toward the table.
  const rrGames = games.filter((g) => g.bracketType === "ROUND_ROBIN" && !g.matchLabel);
  const rows = computeStandings(rrGames);
  return rows.length > 0 ? [{ label: "Classificação geral", rows }] : [];
}

interface RoundTab {
  round: number;
  label: string;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// Round numbers only mean "knockout stage distance from the final" for
// SINGLE/DOUBLE_ELIMINATION matches (and the elimination phase that follows
// group play). For group-stage round-robin matches, `round` is just an
// internal scheduling bucket — labeling it "Quartas/Semifinal" is wrong and
// confusing, since no elimination happened to get there.
function getEliminationRoundLabel(roundIndexFromEnd: number, matchLabel?: string | null): string {
  if (matchLabel === "FINAL" || matchLabel === "GRAND_FINAL") return "Final";
  if (matchLabel === "SEMIFINAL" || matchLabel === "WS") return "Semifinal";
  if (matchLabel === "WF") return "Final Winners";
  if (matchLabel === "LF") return "Final Losers";
  if (matchLabel === "TERCEIRO_LUGAR") return "3º Lugar";

  if (roundIndexFromEnd === 0) return "Final";
  if (roundIndexFromEnd === 1) return "Semifinal";
  if (roundIndexFromEnd === 2) return "Quartas";
  if (roundIndexFromEnd === 3) return "Oitavas";
  return `Rodada ${roundIndexFromEnd + 1}`;
}

function groupLetter(group: number): string {
  return String.fromCharCode(65 + group);
}

function buildRoundTabs(matches: BracketGame[]): RoundTab[] {
  const roundLabels = new Map<number, string>();
  for (const m of matches) {
    if (!roundLabels.has(m.round)) {
      // Tabs are per raw round number, shared across groups (so "Rodada 1"
      // holds every group's first round-robin match together) — use a
      // group-agnostic label for the tab itself.
      const isGroupPhase = m.bracketType === "GROUPS_THEN_ELIMINATION" && m.group !== null;
      const isPlainRoundRobin = m.bracketType === "ROUND_ROBIN" && !m.matchLabel;
      const label = isGroupPhase || isPlainRoundRobin ? `Rodada ${m.round}` : m.courtLabel;
      roundLabels.set(m.round, label);
    }
  }
  return [...roundLabels.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, label]) => ({ round, label }));
}

function parseMatches(bracketData: any[]): BracketGame[] {
  const result: BracketGame[] = [];

  for (const bracket of bracketData) {
    const matches: any[] = Array.isArray(bracket.matches) ? bracket.matches : [];
    const bracketType = bracket.type;

    // Compute "distance from final" only across the elimination-shaped
    // rounds of THIS bracket: for SINGLE/DOUBLE_ELIMINATION that's every
    // match; for GROUPS_THEN_ELIMINATION it's only the post-group knockout
    // phase (group === null); ROUND_ROBIN has no elimination phase at all.
    const elimMatches = matches.filter((m) => {
      if (bracketType === "SINGLE_ELIMINATION" || bracketType === "DOUBLE_ELIMINATION") return true;
      if (bracketType === "GROUPS_THEN_ELIMINATION") return m.group === null || m.group === undefined;
      return false;
    });
    const elimRounds = [...new Set(elimMatches.map((m) => m.round))].sort((a, b) => a - b);

    for (const m of matches) {
      const st = String(m.status ?? "").toUpperCase();
      const status: GameStatus = st === "FINISHED" || st === "WALKOVER" ? "completed" : st === "IN_PROGRESS" ? "live" : "pending";

      const sets1: (number | null)[] = [];
      const sets2: (number | null)[] = [];
      if (m.sets && m.sets.length > 0) {
        for (const s of m.sets) {
          sets1.push(s.scoreA ?? null);
          sets2.push(s.scoreB ?? null);
        }
      } else if (m.scoreTeamA != null || m.scoreTeamB != null) {
        sets1.push(m.scoreTeamA ?? 0);
        sets2.push(m.scoreTeamB ?? 0);
      } else {
        sets1.push(null);
        sets2.push(null);
      }

      const isGroupPhaseMatch = bracketType === "GROUPS_THEN_ELIMINATION" && m.group !== null && m.group !== undefined;
      let courtLabel: string;
      if (isGroupPhaseMatch) {
        courtLabel = `Grupo ${groupLetter(m.group)} · Rodada ${m.round}`;
      } else if (bracketType === "ROUND_ROBIN" && !m.label) {
        courtLabel = `Rodada ${m.round}`;
      } else {
        const idx = elimRounds.indexOf(m.round);
        const fromEnd = idx === -1 ? 0 : elimRounds.length - 1 - idx;
        courtLabel = getEliminationRoundLabel(fromEnd, m.label);
      }

      result.push({
        id: m.id,
        round: m.round,
        group: m.group ?? null,
        bracketType,
        position: m.position,
        status,
        statusLabel: status === "completed"
          ? (st === "WALKOVER" ? "W.O." : "CONCLUÍDO")
          : status === "live" ? "AO VIVO" : "PENDENTE",
        courtLabel,
        matchLabel: m.label ?? null,
        team1Id: m.teamAId ?? null,
        team2Id: m.teamBId ?? null,
        rawStatus: st,
        refereeId: m.refereeId ?? null,
        team1: {
          initials: getInitials(m.teamA?.name ?? "??"),
          name: m.teamA?.name ?? "A definir",
          avatarUrl: m.teamA?.avatarUrl ?? null,
          sets: sets1,
          isWinner: m.winnerId === m.teamAId,
        },
        team2: {
          initials: getInitials(m.teamB?.name ?? "??"),
          name: m.teamB?.name ?? "A definir",
          avatarUrl: m.teamB?.avatarUrl ?? null,
          sets: sets2,
          isWinner: m.winnerId === m.teamBId,
        },
      });
    }
  }

  return result.sort((a, b) => a.round - b.round || (a.group ?? -1) - (b.group ?? -1) || a.position - b.position);
}

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
    link: isDark ? "#C6F82A" : "#7C3AED",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    finalAccent: isDark ? "#C6F82A" : "#7C3AED",
    finalAccentBorder: isDark ? "rgba(198,248,42,0.4)" : "rgba(124,58,237,0.35)",
  }), [isDark, colors]);
}

export function BracketScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const tournamentId = route?.params?.tournamentId;

  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: bracketData, loading, refetch } = useApi(
    () => tournamentId ? tournamentsService.getBracket(tournamentId) : Promise.resolve([]),
    [tournamentId],
  );
  const { data: referees, refetch: refetchReferees } = useApi(
    () => tournamentId ? tournamentsService.getReferees(tournamentId) : Promise.resolve([]),
    [tournamentId],
  );
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); refetchReferees({ keepData: false }); }, [refetch, refetchReferees]));

  // Decoupled from `loading` on purpose: silent socket-driven refetches also
  // flip `loading`, and RefreshControl doesn't know the difference — without
  // this it'd flash the native pull-to-refresh spinner on every live event.
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleManualRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetch(), refetchReferees()]);
    } finally {
      setManualRefreshing(false);
    }
  }, [refetch, refetchReferees]);

  const isReferee = !!currentUserId && (referees ?? []).some((r: any) => (r.userId ?? r.user?.id) === currentUserId);

  // Recomputed only when bracketData actually changes — this screen gets live
  // socket events on every point scored, and without memoizing these, each
  // one would force a full re-sort/re-group of every match and standings row.
  const allGames = useMemo(() => (bracketData ? parseMatches(bracketData) : []), [bracketData]);
  const roundTabs = useMemo(() => buildRoundTabs(allGames), [allGames]);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"bracket" | "standings">("bracket");
  const standingsSections = useMemo(() => buildStandingsSections(allGames), [allGames]);
  const hasStandings = useMemo(() => standingsSections.some((s) => s.rows.length > 0), [standingsSections]);

  // Order rule for referees: matches should be run in round/position order —
  // returns the earliest not-yet-decided match with both teams assigned.
  const earliestPendingGame = allGames.find(
    (g) => g.team1Id && g.team2Id && g.rawStatus !== "FINISHED" && g.rawStatus !== "WALKOVER",
  ) ?? null;

  const [outOfOrderGame, setOutOfOrderGame] = useState<BracketGame | null>(null);
  const [claimingGameId, setClaimingGameId] = useState<string | null>(null);

  // A referee only enters the tournament-wide code once, on their first
  // claim attempt — the backend remembers it (TournamentReferee.codeConfirmed),
  // so every match after that claims straight away with no prompt.
  const [codeDialogVisible, setCodeDialogVisible] = useState(false);
  const [codeDigits, setCodeDigits] = useState("");
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [codeErrorMsg, setCodeErrorMsg] = useState<string | null>(null);
  const [pendingGame, setPendingGame] = useState<BracketGame | null>(null);

  const enterAsReferee = async (game: BracketGame) => {
    if (game.rawStatus === "IN_PROGRESS" && game.refereeId === currentUserId) {
      navigation?.navigate("Referee", { matchId: game.id });
      return;
    }
    setClaimingGameId(game.id);
    try {
      await matchesService.claimMatch(game.id);
      navigation?.navigate("Referee", { matchId: game.id });
    } catch (err: any) {
      if (err?.response?.data?.code === "REFEREE_NOT_INVITED") {
        setPendingGame(game);
        setCodeDigits("");
        setCodeErrorMsg(null);
        setCodeDialogVisible(true);
      } else {
        Alert.alert("Erro", getErrorMessage(err, "Não foi possível selecionar esta partida."));
      }
    } finally {
      setClaimingGameId(null);
    }
  };

  const confirmRefereeCode = async () => {
    if (codeDigits.length !== 6) return;
    setCodeSubmitting(true);
    setCodeErrorMsg(null);
    try {
      await tournamentsService.enterRefereeCode(codeDigits);
      setCodeDialogVisible(false);
      const game = pendingGame;
      setPendingGame(null);
      if (game) enterAsReferee(game);
    } catch (err: any) {
      setCodeErrorMsg(getErrorMessage(err, "Código inválido."));
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleApitar = (game: BracketGame) => {
    const isResume = game.rawStatus === "IN_PROGRESS" && game.refereeId === currentUserId;
    if (!isResume && earliestPendingGame && earliestPendingGame.id !== game.id) {
      setOutOfOrderGame(game);
    } else {
      enterAsReferee(game);
    }
  };

  // Live updates via socket — replaces the old 15s poll (which also had the
  // side effect of flashing the native pull-to-refresh spinner every 15s,
  // since it drove `loading`/`refreshing` on a timer with no user action).
  useEffect(() => {
    if (!tournamentId) return;
    const socket = getSocket();
    socket.emit("tournament:join", { tournamentId });

    const onMatchEvent = (payload: any) => {
      if (payload?.tournamentId && payload.tournamentId !== tournamentId) return;
      refetch({ keepData: true });
    };

    socket.on("match:point", onMatchEvent);
    socket.on("match:start", onMatchEvent);
    socket.on("match:finish", onMatchEvent);
    socket.on("match:update", onMatchEvent);
    socket.on("match:set-finish", onMatchEvent);

    return () => {
      socket.emit("tournament:leave", { tournamentId });
      socket.off("match:point", onMatchEvent);
      socket.off("match:start", onMatchEvent);
      socket.off("match:finish", onMatchEvent);
      socket.off("match:update", onMatchEvent);
      socket.off("match:set-finish", onMatchEvent);
    };
  }, [tournamentId, refetch]);

  const filteredGames = activeRound != null
    ? allGames.filter(g => g.round === activeRound)
    : allGames;

  // Group filtered games by their section label — a raw round number can span
  // multiple sections (e.g. "Grupo A · Rodada 1" and "Grupo B · Rodada 1" both
  // have round=1), so group by label rather than by round to keep them separate.
  const groupedRounds = (() => {
    const order: string[] = [];
    const byLabel = new Map<string, BracketGame[]>();
    for (const g of filteredGames) {
      if (!byLabel.has(g.courtLabel)) {
        byLabel.set(g.courtLabel, []);
        order.push(g.courtLabel);
      }
      byLabel.get(g.courtLabel)!.push(g);
    }
    return order.map((label) => ({ label, round: byLabel.get(label)![0].round, games: byLabel.get(label)! }));
  })();

  // Champion (only when the final is decided)
  const finalGame = allGames.find(g => g.courtLabel === "Final");
  const champion = finalGame && finalGame.status === "completed"
    ? (finalGame.team1.isWinner ? finalGame.team1 : finalGame.team2.isWinner ? finalGame.team2 : null)
    : null;

  if (loading && !bracketData) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={C.lime} />
      </SafeAreaView>
    );
  }

  if (allGames.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <HeaderRow navigation={navigation} tournamentId={tournamentId} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center" }}>
            Nenhum chaveamento gerado ainda.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <HeaderRow navigation={navigation} tournamentId={tournamentId} />
      </View>

      {hasStandings && (
        <View style={{ flexDirection: "row", paddingHorizontal: 22, gap: 8, marginTop: 4, marginBottom: 4 }}>
          {[{ key: "bracket" as const, label: "Chaveamento" }, { key: "standings" as const, label: "Classificação" }].map((tab) => {
            const isActive = viewMode === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setViewMode(tab.key)}
                style={{
                  flex: 1, paddingVertical: 11, borderRadius: 13, alignItems: "center",
                  backgroundColor: isActive ? C.purple : C.card,
                  borderWidth: 1, borderColor: isActive ? C.purple : C.cardBorder,
                }}
              >
                <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 12.5, letterSpacing: 0.6, textTransform: "uppercase", color: isActive ? C.onAccent : C.tx2 }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {viewMode === "standings" && hasStandings ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleManualRefresh} tintColor={C.lime} />}
        >
          {standingsSections.map((section) => (
            <StandingsTable key={section.label} label={section.label} rows={section.rows} />
          ))}
        </ScrollView>
      ) : (
      <>
      {/* Dynamic round tabs */}
      {roundTabs.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 6, paddingTop: 12, paddingBottom: 12 }}
        >
          {/* "Todos" tab */}
          {[{ round: null, label: "Todos" }, ...roundTabs].map((tab) => {
            const isActive = activeRound === tab.round;
            return (
              <Pressable
                key={tab.label}
                onPress={() => setActiveRound(tab.round)}
                style={{
                  minWidth: 80, height: 36, paddingHorizontal: 15, borderRadius: 11,
                  justifyContent: "center",
                  backgroundColor: isActive ? C.purple : C.card,
                  borderWidth: 1,
                  borderColor: isActive ? C.purple : C.cardBorder,
                  alignItems: "center",
                }}
              >
                <Text style={{
                  fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase",
                  color: isActive ? C.onAccent : C.tx2,
                }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleManualRefresh} tintColor={C.lime} />}
      >
        {champion ? <ChampionBanner team={champion} /> : null}
        {groupedRounds.map((grp) => (
          <View key={grp.label} style={{ marginBottom: 4 }}>
            <RoundSectionHeader label={grp.games[0].courtLabel} count={grp.games.length} />
            {grp.games.map((game) => {
              const canClaim = isReferee && game.rawStatus === "SCHEDULED" && game.team1Id && game.team2Id && !game.refereeId;
              const canResume = isReferee && game.rawStatus === "IN_PROGRESS" && game.refereeId === currentUserId;
              return (
                <MatchCard
                  key={game.id}
                  game={game}
                  isFinal={grp.games[0].courtLabel === "Final"}
                  onPress={() => {
                    if (game.status === "live") navigation?.navigate("MatchLive", { matchId: game.id });
                    else if (game.status === "completed") navigation?.navigate("MatchResult", { matchId: game.id });
                  }}
                  canClaim={!!canClaim}
                  canResume={canResume}
                  isClaiming={claimingGameId === game.id}
                  onApitar={() => handleApitar(game)}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={!!outOfOrderGame}
        title="Jogo fora de ordem"
        message="Ainda há partidas anteriores não concluídas. Deseja mesmo apitar este jogo fora da ordem do chaveamento?"
        cancelLabel="Cancelar"
        actionLabel="Apitar mesmo assim"
        danger
        onCancel={() => setOutOfOrderGame(null)}
        onConfirm={() => {
          const game = outOfOrderGame;
          setOutOfOrderGame(null);
          if (game) enterAsReferee(game);
        }}
      />

      <ConfirmDialog
        visible={codeDialogVisible}
        title="Código de árbitro"
        cancelLabel="Cancelar"
        actionLabel="Confirmar"
        loading={codeSubmitting}
        onCancel={() => { setCodeDialogVisible(false); setPendingGame(null); }}
        onConfirm={confirmRefereeCode}
      >
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13.5, marginBottom: 14 }}>
          Insira o código de 6 dígitos fornecido pelo organizador. Você só precisa fazer isso uma vez neste torneio.
        </Text>
        <TextInput
          value={codeDigits}
          onChangeText={(t) => setCodeDigits(t.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          placeholder="XXXXXX"
          placeholderTextColor={C.tx3}
          style={{
            backgroundColor: C.isDark ? "#0F0F13" : "#F0ECFA", borderWidth: 1.5, borderColor: codeErrorMsg ? C.danger : C.cardBorder,
            borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, color: C.tx,
            fontFamily: "Oswald_700Bold", fontSize: 20, letterSpacing: 4, textAlign: "center",
          }}
          accessibilityLabel="Código do árbitro"
        />
        {codeErrorMsg && (
          <Text style={{ color: C.danger, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 8 }}>{codeErrorMsg}</Text>
        )}
      </ConfirmDialog>
      </>
      )}
    </SafeAreaView>
  );
}

function HeaderRow({ navigation, tournamentId }: { navigation: any; tournamentId?: string }) {
  const C = useScreenColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 }}>
      <Pressable
        onPress={() => {
          // Prefer a real goBack() — it's whatever screen actually led here
          // (Bracket is reached from several places). Only force a fixed
          // destination when there's truly nothing behind it (e.g. deep link),
          // otherwise a forced navigate() here fights the natural back chain
          // and produces back-button ping-pong between this and TournamentDetail.
          if (navigation?.canGoBack?.()) navigation.goBack();
          else navigation?.navigate("TournamentDetail", { id: tournamentId });
        }}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={{
          width: 42, height: 42, borderRadius: 14,
          backgroundColor: C.card,
          borderWidth: 1, borderColor: C.cardBorder,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name="back" size={19} color={C.tx} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
          Chaveamento
        </Text>
      </View>
    </View>
  );
}

function TeamCol({ team, win, decided }: { team: TeamScore; win: boolean; decided: boolean }) {
  const C = useScreenColors();
  const dim = decided && !win;
  const nameColor = win ? C.tx : dim ? C.tx3 : C.tx2;
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
      {team.avatarUrl ? (
        <Image source={{ uri: team.avatarUrl }} style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 2, borderColor: win ? C.lime : C.cardBorder, opacity: dim ? 0.55 : 1 }} />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: C.purpleDeep, borderWidth: 2, borderColor: win ? C.lime : C.cardBorder, alignItems: "center", justifyContent: "center", opacity: dim ? 0.6 : 1 }}>
          <Text style={{ color: win ? C.lime : "#CFC8E0", fontFamily: "Oswald_700Bold", fontSize: 15 }}>{team.initials}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={{ color: nameColor, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center", maxWidth: 104 }}>
        {team.name}
      </Text>
    </View>
  );
}

function MatchCard({ game, isFinal, onPress, canClaim, canResume, isClaiming, onApitar }: {
  game: BracketGame; isFinal?: boolean; onPress: () => void;
  canClaim?: boolean; canResume?: boolean; isClaiming?: boolean; onApitar?: () => void;
}) {
  const C = useScreenColors();
  const isLive = game.status === "live";
  const isPending = game.status === "pending";
  const awaitingTeams = game.team1.name === "A definir" && game.team2.name === "A definir";
  const statusColor = game.status === "completed" ? C.link : isLive ? C.danger : awaitingTeams ? (C.isDark ? "#B79BFF" : C.purple) : C.tx3;

  // The last entry in `sets` is the currently-open set once the match is
  // live — its score changes point by point, so it shouldn't count toward
  // "sets won" yet (that's not decided until the set actually finishes).
  const liveSetIndex = isLive ? game.team1.sets.length - 1 : -1;
  let wonA = 0, wonB = 0;
  const breakdown: string[] = [];
  game.team1.sets.forEach((a, i) => {
    const b = game.team2.sets[i];
    if (a == null || b == null || i === liveSetIndex) return;
    if (a > b) wonA++; else if (b > a) wonB++;
    breakdown.push(`${a}-${b}`);
  });
  const liveScoreA = isLive ? game.team1.sets[liveSetIndex] ?? 0 : null;
  const liveScoreB = isLive ? game.team2.sets[liveSetIndex] ?? 0 : null;
  const hasScore = breakdown.length > 0;
  const decided = game.status === "completed";
  const aWin = game.team1.isWinner ?? false;
  const bWin = game.team2.isWinner ?? false;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 18, padding: 16, marginBottom: 12,
        backgroundColor: C.card,
        borderWidth: isFinal ? 1.5 : 1,
        borderStyle: awaitingTeams ? "dashed" : "solid",
        borderColor: isFinal ? C.finalAccentBorder : isLive ? "rgba(255,77,94,0.28)" : awaitingTeams ? "rgba(183,155,255,0.3)" : C.cardBorder,
        opacity: awaitingTeams ? 0.75 : 1,
      }}
    >
      {/* Status row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${statusColor}1F`, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
          {awaitingTeams ? (
            <Icon name="lock" size={9} color={statusColor} />
          ) : (
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: statusColor }} />
          )}
          <Text style={{ color: statusColor, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>
            {awaitingTeams ? "AGUARDANDO GRUPOS" : game.statusLabel}
          </Text>
        </View>
        <Text style={{ color: C.tx3, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>Jogo {game.position + 1}</Text>
      </View>

      {/* VS row */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TeamCol team={game.team1} win={decided && aWin} decided={decided} />

        <View style={{ width: 66, alignItems: "center", justifyContent: "center" }}>
          {isLive ? (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 0.8, marginBottom: 3 }}>SET {game.team1.sets.length}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>{liveScoreA}</Text>
                <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 13 }}>×</Text>
                <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>{liveScoreB}</Text>
              </View>
              {(wonA > 0 || wonB > 0) && (
                <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 10, marginTop: 4 }}>Sets {wonA}-{wonB}</Text>
              )}
            </View>
          ) : hasScore ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: decided && aWin ? C.lime : C.tx, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>{wonA}</Text>
              <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 13 }}>×</Text>
              <Text style={{ color: decided && bWin ? C.lime : C.tx, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>{wonB}</Text>
            </View>
          ) : awaitingTeams ? (
            <View style={{ width: 40, height: 40, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(183,155,255,0.35)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock" size={14} color={C.isDark ? "#B79BFF" : C.purple} />
            </View>
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isPending ? C.purpleTintBg : C.purple, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: isPending ? (C.isDark ? "#B79BFF" : C.purple) : C.onAccent, fontFamily: "Anton_400Regular", fontSize: 14, letterSpacing: 0.5 }}>VS</Text>
            </View>
          )}
        </View>

        <TeamCol team={game.team2} win={decided && bWin} decided={decided} />
      </View>

      {/* Set breakdown */}
      {hasScore ? (
        <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11, textAlign: "center", marginTop: 12 }}>
          {breakdown.join("   ·   ")}
        </Text>
      ) : null}

      {awaitingTeams ? (
        <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 10.5, textAlign: "center", marginTop: 10 }}>
          Times definidos após o fim da fase de grupos
        </Text>
      ) : null}

      {(canClaim || canResume) && (
        <Pressable
          onPress={onApitar}
          disabled={isClaiming}
          style={{
            marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color={C.link} />
          ) : (
            <>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M2 8a4 4 0 014-4h1a2 2 0 012 2v2a2 2 0 01-2 2H6" stroke={C.link} strokeWidth={1.8} />
                <Path d="M6 8v9a3 3 0 003 3h6a3 3 0 003-3V8" stroke={C.link} strokeWidth={1.8} />
                <Path d="M18 8h1a2 2 0 002-2V4a2 2 0 00-2-2h-1a4 4 0 00-4 4" stroke={C.link} strokeWidth={1.8} />
              </Svg>
              <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {canResume ? "Continuar apitando" : "Apitar esta partida"}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

function RoundSectionHeader({ label, count }: { label: string; count: number }) {
  const C = useScreenColors();
  const isFinal = label === "Final";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 12 }}>
      <View style={{ width: 4, height: isFinal ? 22 : 18, borderRadius: 2, backgroundColor: isFinal ? C.finalAccent : C.purple }} />
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: isFinal ? 24 : 19, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</Text>
      {isFinal ? <Icon name="trophy" size={18} color={C.finalAccent} /> : null}
      <View style={{ flex: 1 }} />
      <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{count} jogo{count > 1 ? "s" : ""}</Text>
    </View>
  );
}

function ChampionBanner({ team }: { team: { name: string; initials: string; avatarUrl: string | null } }) {
  const C = useScreenColors();
  return (
    <View style={{ borderRadius: 20, overflow: "hidden", marginBottom: 20, marginTop: 4 }}>
      <LinearGradient colors={["#2D1B69", "#140E28"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 22, paddingHorizontal: 20, alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(198,248,42,0.16)", borderWidth: 1, borderColor: "rgba(198,248,42,0.4)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon name="trophy" size={24} color={C.lime} />
        </View>
        <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Campeão</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {team.avatarUrl ? (
            <Image source={{ uri: team.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: C.lime }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#0C0A12", borderWidth: 2, borderColor: C.lime, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 15 }}>{team.initials}</Text>
            </View>
          )}
          <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.4, textTransform: "uppercase", maxWidth: 200 }}>{team.name}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function StandingsTable({ label, rows }: { label: string; rows: StandingsRow[] }) {
  const C = useScreenColors();
  if (rows.length === 0) return null;
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: C.purple }} />
        <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 19, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</Text>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden" }}>
        {/* Column headers */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.isDark ? "rgba(255,255,255,0.03)" : "rgba(26,16,48,0.03)" }}>
          <Text style={{ width: 22, color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 9.5, letterSpacing: 0.6 }}>#</Text>
          <Text style={{ flex: 1, color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase" }}>Time</Text>
          {["J", "V", "D", "PF", "PA", "SC"].map((h) => (
            <Text key={h} style={{ width: 30, textAlign: "center", color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 9.5, letterSpacing: 0.6 }}>{h}</Text>
          ))}
        </View>

        {rows.map((r, i) => {
          const saldo = r.pointsFor - r.pointsAgainst;
          const isLeader = i === 0;
          return (
            <View
              key={r.teamId}
              style={{
                flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.cardBorder,
                backgroundColor: isLeader ? C.limeTintBg : "transparent",
              }}
            >
              <Text style={{ width: 22, color: isLeader ? C.link : C.tx2, fontFamily: "Anton_400Regular", fontSize: 14 }}>{i + 1}</Text>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 6 }}>
                {r.avatarUrl ? (
                  <Image source={{ uri: r.avatarUrl }} style={{ width: 26, height: 26, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#CFC8E0", fontFamily: "Oswald_700Bold", fontSize: 10 }}>{getInitials(r.name)}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={{ flex: 1, color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 12.5 }}>{r.name}</Text>
              </View>
              <Text style={{ width: 30, textAlign: "center", color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{r.played}</Text>
              <Text style={{ width: 30, textAlign: "center", color: C.link, fontFamily: "Manrope_700Bold", fontSize: 12 }}>{r.wins}</Text>
              <Text style={{ width: 30, textAlign: "center", color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{r.losses}</Text>
              <Text style={{ width: 30, textAlign: "center", color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11.5 }}>{r.pointsFor}</Text>
              <Text style={{ width: 30, textAlign: "center", color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11.5 }}>{r.pointsAgainst}</Text>
              <Text style={{ width: 30, textAlign: "center", color: saldo > 0 ? C.link : saldo < 0 ? C.danger : C.tx2, fontFamily: "Manrope_700Bold", fontSize: 11.5 }}>
                {saldo > 0 ? `+${saldo}` : saldo}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
