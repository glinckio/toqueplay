import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image as RNImage,
  Pressable,
  StatusBar,
  RefreshControl,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuthStore } from "@/stores/authStore";
import { useApi } from "@/hooks/useApi";
import { homeService } from "@/services/homeService";
import { usersService } from "@/services/usersService";
import { tournamentsService } from "@/services/tournamentsService";
import { matchesService } from "@/services/matchesService";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { SplashScreen as LocationGateScreen } from "@/screens/splash/SplashScreen";
import { formatDate } from "@/utils/dateFormat";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

// Runs the location gate once per app session (module scope survives screen
// remounts/navigation, resets only on app restart).
let locationGateDoneThisSession = false;

// getCurrentPositionAsync has no built-in timeout and hangs forever when the
// device (or emulator) has no active GPS fix — race it against a timeout and
// fall back to the last cached fix so the flow never gets stuck.
async function getPositionWithFallback(tag: string) {
  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout-8s")), 8000)),
    ]);
    return loc;
  } catch (err: any) {
    console.warn(`[LOCATION][${tag}] getCurrentPositionAsync failed/timed out (${err?.message}), trying getLastKnownPositionAsync...`);
    const last = await Location.getLastKnownPositionAsync({});
    if (!last) throw new Error("Nenhuma posição disponível (nem atual, nem em cache).");
    return last;
  }
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
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    danger: "#FF4D5E",
    // Icon-badge tints — a translucent purple/lime over near-black reads fine
    // in dark mode, but the same alpha over a light card just looks washed
    // out and muddy. Light mode gets a solid pastel tint instead.
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

const LIVE_HERO_IMAGE = "https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=760&q=75";
// Fallback banner for tournaments without an organizer-uploaded imageUrl.
const TOURNAMENT_DEFAULT_IMAGE = RNImage.resolveAssetSource(require("@/../assets/tournament-default.png")).uri;

interface FriendlySummary {
  id: string;
  title: string;
  date: string;
  detail: string;
  confirmed: boolean;
}

interface LiveMatch {
  tournament: string;
  subtitle: string;
  court: string;
  set: number;
  teamA: { initials: string; name: string };
  teamB: { initials: string; name: string };
  score: { a: number; b: number };
  setScores: string;
}

/* ---------------- Week strip (current week, Sunday → Saturday) ---------------- */
const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function getCurrentWeekDates(base: Date): Date[] {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // rewind to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function WeekStrip() {
  const C = useScreenColors();
  const today = useRef(new Date()).current;
  const weekDates = useRef(getCurrentWeekDates(today)).current;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 22 }}>
      {weekDates.map((d) => {
        const key = d.toDateString();
        const isToday = key === today.toDateString();
        return (
          <View key={key} style={{ alignItems: "center", width: 40 }}>
            <Text style={{ color: isToday ? (C.isDark ? C.lime : C.purple) : C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              {WEEKDAY_LABELS[d.getDay()]}
            </Text>
            <View
              style={{
                width: 46,
                height: 74,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isToday ? C.lime : C.card,
              }}
            >
              <Text
                style={{
                  color: isToday ? C.limeInk : C.tx,
                  fontFamily: "Oswald_700Bold",
                  fontSize: 18,
                }}
              >
                {String(d.getDate()).padStart(2, "0")}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- Pulsing live dot ---------------- */
function PulseDot() {
  const C = useScreenColors();
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(s, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [s]);
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const opacity = s.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={{ width: 6, height: 6, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeInk, transform: [{ scale }], opacity }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.limeInk }} />
    </View>
  );
}

export function HomeScreen() {
  const C = useScreenColors();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "Jogador";
  const goToTournament = useCallback((id: string) => navigation.navigate("TournamentDetail" as any, { id }), [navigation]);
  const goToFriendly = useCallback((id: string) => navigation.navigate("FriendlyDetail" as any, { id }), [navigation]);

  const [locationGranted, setLocationGranted] = useState(false);
  const [locationGateOpen, setLocationGateOpen] = useState(!locationGateDoneThisSession);
  const [locationGateProgress, setLocationGateProgress] = useState(0.08);
  const locationGateFinishedRef = useRef(false);
  const locationGateOpenedAtRef = useRef(Date.now());
  const MIN_GATE_MS = 1500;
  const finishLocationGate = useCallback(() => {
    if (locationGateFinishedRef.current) return;
    locationGateFinishedRef.current = true;
    locationGateDoneThisSession = true;
    setLocationGateProgress(1);
    const elapsed = Date.now() - locationGateOpenedAtRef.current;
    const wait = Math.max(260, MIN_GATE_MS - elapsed);
    setTimeout(() => setLocationGateOpen(false), wait);
  }, []);
  const [isReferee, setIsReferee] = useState(false);
  const [refereeTournamentId, setRefereeTournamentId] = useState<string | null>(null);
  const [activeRefereeMatch, setActiveRefereeMatch] = useState<any>(null);
  const { data: dashboard, loading, error, refetch } = useApi(() => homeService.getDashboard(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  // Entrance animation
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (dashboard) {
      Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [dashboard, enter]);
  const enterStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  // Hide the floating bottom tab bar while the full-screen location-gate
  // splash is showing — it belongs on top of the Home content, not on top
  // of a loading splash.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: locationGateOpen ? { display: "none" } : undefined });
  }, [locationGateOpen, navigation]);

  // Simulated progress for the full-screen location gate: ramps toward 92%
  // over the same window getPositionWithFallback is allowed to take (8s hard
  // timeout + margin), then finishLocationGate() snaps it to 100%.
  useEffect(() => {
    if (!locationGateOpen) return;
    const start = Date.now();
    const EXPECTED_MS = 8500;
    const interval = setInterval(() => {
      const pct = Math.min(0.92, (Date.now() - start) / EXPECTED_MS);
      setLocationGateProgress((prev) => Math.max(prev, pct));
    }, 120);
    return () => clearInterval(interval);
  }, [locationGateOpen]);

  useEffect(() => {
    usersService.getProfile().then((profile) => {
      const current = useAuthStore.getState().user;
      if (current && profile.avatarUrl !== current.avatarUrl) {
        useAuthStore.getState().setUser({ ...current, avatarUrl: profile.avatarUrl });
      }
      // Already has a saved location from a previous session — no need to
      // block on a fresh GPS fix, the gate can close right away.
      if (profile.latitude != null && profile.longitude != null) {
        setLocationGranted(true);
        finishLocationGate();
      }
    }).catch(() => {});

    tournamentsService.findRefereeMine().then((list) => {
      const today = new Date().toDateString();
      const todayTournament = list.find((t: any) =>
        t.status === "IN_PROGRESS" &&
        t.stages?.some((s: any) => s.date && new Date(s.date).toDateString() === today)
      );
      setIsReferee(!!todayTournament);
      setRefereeTournamentId(todayTournament?.id ?? null);
    }).catch(() => {});

    matchesService.findRefereeMine().then((matches) => {
      const active = matches.find((m: any) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS");
      setActiveRefereeMatch(active || null);
    }).catch(() => {});

    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        setLocationGranted(true);
        getPositionWithFallback("auto").then((loc) => {
          usersService.updateLocation(loc.coords.latitude, loc.coords.longitude)
            .catch((err) => console.error("[LOCATION][auto] backend updateLocation FAILED:", err?.response?.status, err?.response?.data ?? err?.message))
            .finally(finishLocationGate);
        }).catch((err) => {
          console.error("[LOCATION][auto] FAILED:", err?.message ?? err);
          finishLocationGate();
        });
      } else {
        // Permission not granted — don't block the user forever; the Home
        // already shows an "Ativar localização" card in this state.
        finishLocationGate();
      }
    }).catch((err) => {
      console.error("[LOCATION][auto] getForegroundPermissionsAsync FAILED:", err);
      finishLocationGate();
    });
  }, [finishLocationGate]);

  const liveMatch = dashboard?.liveMatches?.[0] ?? null;
  const hasLive = !!liveMatch;
  const nearbyTournaments = dashboard?.nearbyTournaments ?? [];
  const hasNearby = nearbyTournaments.length > 0;
  const myTournaments = dashboard?.myTournaments ?? [];
  const hasMyTournaments = myTournaments.length > 0;

  const myFriendlies: FriendlySummary[] = [
    ...(dashboard?.acceptedFriendlies ?? []).map((f) => ({
      id: f.id,
      title: `${f.requesterTeam?.name ?? f.requester?.name ?? "Time A"} vs ${f.challengedTeam?.name ?? f.challenged?.name ?? "Time B"}`,
      date: f.date,
      detail: f.city ? `${formatDate(f.date, { day: "numeric", month: "short" })} · ${f.city}` : formatDate(f.date, { day: "numeric", month: "short" }),
      confirmed: true,
    })),
    ...(dashboard?.pendingFriendlies ?? []).map((f) => ({
      id: f.id,
      title: `${f.teamAName || "Time A"} vs ${f.teamBName || "Time B"}`,
      date: f.date,
      detail: `${formatDate(f.date, { day: "numeric", month: "short" })} · Aguardando confirmação`,
      confirmed: false,
    })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  const hasFriendlies = myFriendlies.length > 0;

  if (locationGateOpen) {
    return <LocationGateScreen subtitle="Encontrando torneios perto de você..." progress={locationGateProgress} />;
  }

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: C.purple }}>
            <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 3 }}>
              Olá, {firstName}
            </Text>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 30, lineHeight: 30, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Bora jogar
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => navigation.navigate("Notifications")}
              accessibilityRole="button" accessibilityLabel="Notificações"
              style={{ position: "relative", width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="bell" size={18} color={C.tx} />
              {(dashboard?.unreadNotifications ?? 0) > 0 && (
                <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime, borderWidth: 2, borderColor: C.card }} />
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.getParent()?.navigate("Profile")}
              accessibilityRole="button" accessibilityLabel="Perfil"
              style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: C.purple }}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <LinearGradient colors={["#8B5CF6", "#6D3BEA"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 16 }}>{firstName[0]?.toUpperCase()}</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>

        <Animated.View style={enterStyle}>
          <WeekStrip />

          {/* Live hero */}
          {hasLive && liveMatch && (
            <LiveCard
              match={{
                tournament: liveMatch.tournament.name,
                subtitle: liveMatch.round,
                court: liveMatch.court,
                set: liveMatch.currentSet,
                teamA: { initials: liveMatch.teamA.initials, name: liveMatch.teamA.name },
                teamB: { initials: liveMatch.teamB.initials, name: liveMatch.teamB.name },
                score: { a: liveMatch.scoreA, b: liveMatch.scoreB },
                setScores: liveMatch.setScores,
              }}
              onWatch={() => navigation.navigate("MatchLive" as any, { matchId: liveMatch?.id ?? "live-1" })}
            />
          )}

          {/* Referee — unified (resume active match, or start whistling) */}
          {(activeRefereeMatch || isReferee) && (
            <Pressable
              onPress={() => activeRefereeMatch
                ? navigation.navigate("Referee" as any, { matchId: activeRefereeMatch.id })
                : navigation.navigate("Bracket" as any, { tournamentId: refereeTournamentId })}
              accessibilityRole="button"
              accessibilityLabel={activeRefereeMatch ? "Voltar à partida" : "Apitar partida"}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: activeRefereeMatch ? "rgba(198,248,42,0.3)" : C.cardBorder, borderRadius: 18, padding: 16, marginBottom: 16 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M2 8a4 4 0 014-4h1a2 2 0 012 2v2a2 2 0 01-2 2H6" stroke={C.purple} strokeWidth={1.8} />
                  <Path d="M6 8v9a3 3 0 003 3h6a3 3 0 003-3V8" stroke={C.purple} strokeWidth={1.8} />
                  <Path d="M18 8h1a2 2 0 002-2V4a2 2 0 00-2-2h-1a4 4 0 00-4 4" stroke={C.purple} strokeWidth={1.8} />
                  <Circle cx={12} cy={13} r={2} stroke={C.purple} strokeWidth={1.8} />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                {activeRefereeMatch ? (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: C.lime, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 20, marginBottom: 4 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.limeInk }} />
                      <Text style={{ color: C.limeInk, fontFamily: "Oswald_700Bold", fontSize: 8, letterSpacing: 0.8 }}>SUA PARTIDA · AO VIVO</Text>
                    </View>
                    <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>
                      {activeRefereeMatch.teamA?.name ?? "Time A"} vs {activeRefereeMatch.teamB?.name ?? "Time B"}
                    </Text>
                    <Text numberOfLines={1} style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 1 }}>
                      Toque para voltar a apitar
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14, marginBottom: 2 }}>Apitar partida</Text>
                    <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>Selecione ou insira o código do organizador</Text>
                  </>
                )}
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="m9 6 6 6-6 6" stroke={activeRefereeMatch ? C.lime : C.tx3} strokeWidth={2} /></Svg>
            </Pressable>
          )}

          {/* Torneios próximos */}
          <SectionHeader title="Torneios próximos" onSeeAll={() => navigation.navigate("Explore" as any)} />

          {hasNearby ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 24 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
              {nearbyTournaments.map((t, i) => (
                <NearbyCard
                  key={t.id}
                  id={t.id}
                  index={i}
                  image={t.coverUrl || TOURNAMENT_DEFAULT_IMAGE}
                  status={t.status}
                  name={t.name}
                  distance={`${t.distance} km · ${t.date}`}
                  onPress={goToTournament}
                />
              ))}
            </ScrollView>
          ) : !locationGranted ? (
            <EmptyState
              icon="location"
              title="Nada por perto ainda"
              body="Ative a localização para descobrir torneios na sua região."
              ctaLabel="Ativar localização"
              onCta={async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") { Alert.alert("Permissão negada", "Ative a localização nas configurações do dispositivo."); return; }
                  setLocationGranted(true);
                  const loc = await getPositionWithFallback("cta");
                  await usersService.updateLocation(loc.coords.latitude, loc.coords.longitude);
                  refetch();
                } catch (err: any) {
                  console.error("[LOCATION][cta] FAILED:", err?.response?.status, err?.response?.data ?? err?.message ?? err);
                  Alert.alert("Erro", `Não foi possível obter a localização.\n${String(err?.response?.data?.message ?? err?.message ?? err)}`);
                }
              }}
            />
          ) : (
            <EmptyState icon="search" title="Nenhum torneio por perto" body="Não encontramos torneios na sua região. Explore todos os disponíveis." />
          )}

          {/* Meus torneios */}
          <SectionHeader title="Meus torneios" onSeeAll={() => navigation.navigate("MyTournaments")} />

          {hasMyTournaments ? (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingHorizontal: 14 }}>
              {myTournaments.map((t, i) => (
                <MyTournamentRow
                  key={t.id}
                  id={t.id}
                  index={i}
                  image={t.coverUrl || TOURNAMENT_DEFAULT_IMAGE}
                  name={t.name}
                  detail={`${t.date} · ${t.categoryFormat}`}
                  status={t.registrationStatus === "PAID" ? "paid" : "pending"}
                  isLast={i === myTournaments.length - 1}
                  onPress={goToTournament}
                />
              ))}
            </View>
          ) : (
            <EmptyState icon="trophy" title="Você ainda não se inscreveu" body="Encontre um torneio e inscreva seu time para vê-lo aqui." ctaLabel="Explorar torneios" onCta={() => navigation.navigate("Explore" as any)} />
          )}

          {/* Meus amistosos */}
          <SectionHeader title="Meus amistosos" onSeeAll={() => navigation.navigate("MyFriendlies" as any)} />

          {hasFriendlies ? (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingHorizontal: 14 }}>
              {myFriendlies.map((f, i) => (
                <FriendlyRow
                  key={f.id}
                  id={f.id}
                  index={i}
                  title={f.title}
                  detail={f.detail}
                  confirmed={f.confirmed}
                  isLast={i === myFriendlies.length - 1}
                  onPress={goToFriendly}
                />
              ))}
            </View>
          ) : (
            <EmptyState icon="users" title="Nenhum amistoso por aqui" body="Desafie outro time ou aceite um convite para ver seus amistosos aqui." ctaLabel="Criar amistoso" onCta={() => navigation.navigate("CreateFriendly" as any)} />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Section header ---------------- */
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const C = useScreenColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.4, textTransform: "uppercase" }}>{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={8}>
        <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Ver todos</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- Live card ---------------- */
const LiveCard = React.memo(function LiveCard({ match, onWatch }: { match: LiveMatch; onWatch: () => void }) {
  const C = useScreenColors();
  const leaderA = match.score.a >= match.score.b;
  return (
    <View style={{ marginBottom: 20 }}>
      {/* photo + badges */}
      <View style={{ height: 150, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", position: "relative" }}>
        <Image source={{ uri: LIVE_HERO_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
        <LinearGradient colors={["rgba(124,58,237,0.5)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.92)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.lime, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 }}>
          <PulseDot />
          <Text style={{ color: C.limeInk, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 1 }}>AO VIVO · SET {match.set}</Text>
        </View>
        <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 }}>
          <Text style={{ color: C.tx, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.6 }}>{match.court}</Text>
        </View>
        <View style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
          <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.4, textTransform: "uppercase" }}>{match.tournament}</Text>
          <Text style={{ color: C.lime, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{match.subtitle}</Text>
        </View>
      </View>

      {/* score row */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderTopWidth: 0, borderColor: C.cardBorder, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 16, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, alignItems: "center", gap: 7 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 14 }}>{match.teamA.initials}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4 }}>{match.teamA.name}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6 }}>
          <Text style={{ color: leaderA ? C.lime : C.tx, fontFamily: "Anton_400Regular", fontSize: 40, letterSpacing: 0.5 }}>{match.score.a}</Text>
          <Text style={{ color: C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 14 }}>×</Text>
          <Text style={{ color: !leaderA ? C.lime : C.tx, fontFamily: "Anton_400Regular", fontSize: 40, letterSpacing: 0.5 }}>{match.score.b}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", gap: 7 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#241B38", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 14 }}>{match.teamB.initials}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4 }}>{match.teamB.name}</Text>
        </View>
      </View>

      {match.setScores ? (
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, textAlign: "center", marginTop: 8 }}>{match.setScores}</Text>
      ) : null}

      {/* watch CTA — notched purple */}
      <Pressable onPress={onWatch} style={{ position: "relative", marginTop: 12 }}>
        <View style={{ backgroundColor: C.purple, borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill={C.onAccent}><Path d="M8 5v14l11-7z" /></Svg>
          <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Assistir agora</Text>
        </View>
        <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
        <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
      </Pressable>
    </View>
  );
});

/* ---------------- Nearby card (framed tilted thumbnail motif) ---------------- */
// Nearby tournaments are only ever fetched in these statuses (see backend
// home.service.ts activeStatus filter) — no need to cover FINISHED/CANCELLED/DRAFT here.
function getNearbyStatusConfig(C: ReturnType<typeof useScreenColors>): Record<string, { label: string; bg: string; tx: string }> {
  return {
    PUBLISHED: { label: "ABERTAS", bg: C.lime, tx: C.limeInk },
    REGISTRATION_OPEN: { label: "ABERTAS", bg: C.lime, tx: C.limeInk },
    REGISTRATION_CLOSED: { label: "ENCERRADAS", bg: C.card, tx: C.tx2 },
    BRACKET_GENERATED: { label: "EM ANDAMENTO", bg: C.purple, tx: C.tx },
    IN_PROGRESS: { label: "EM ANDAMENTO", bg: C.purple, tx: C.tx },
  };
}

const NearbyCard = React.memo(function NearbyCard({ id, index, image, status, name, distance, onPress }: { id: string; index: number; image: string; status: string; name: string; distance: string; onPress: (id: string) => void }) {
  const C = useScreenColors();
  const tilt = index % 2 === 0 ? -3 : 3;
  const statusConf = getNearbyStatusConfig(C)[status] ?? { label: status, bg: C.purple, tx: C.tx };
  return (
    <Pressable style={{ width: 150 }} onPress={() => onPress(id)} accessibilityRole="button" accessibilityLabel={name}>
      <View style={{ height: 100, marginBottom: 12, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 138, height: 92, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(198,248,42,0.55)", transform: [{ rotate: `${tilt}deg` }] }}>
          <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.5)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }} />
        </View>
        <View style={{ position: "absolute", top: 4, left: 10, backgroundColor: statusConf.bg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, transform: [{ rotate: `${tilt}deg` }] }}>
          <Text style={{ color: statusConf.tx, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.5 }}>{statusConf.label}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 15, letterSpacing: 0.3, textTransform: "uppercase" }}>{name}</Text>
      <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 3 }}>{distance}</Text>
    </Pressable>
  );
});

/* ---------------- My tournament row ---------------- */
const MyTournamentRow = React.memo(function MyTournamentRow({ id, index, image, name, detail, status, isLast, onPress }: { id: string; index: number; image: string; name: string; detail: string; status: "paid" | "pending"; isLast: boolean; onPress: (id: string) => void }) {
  const C = useScreenColors();
  const tilt = index % 2 === 0 ? -4 : 4;
  return (
    <Pressable onPress={() => onPress(id)} accessibilityRole="button" accessibilityLabel={name} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.cardBorder }}>
      <View style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(198,248,42,0.5)", transform: [{ rotate: `${tilt}deg` }] }}>
        <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{name}</Text>
        <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 1 }}>{detail}</Text>
      </View>
      <Badge status={status} size="md" />
    </Pressable>
  );
});

/* ---------------- Friendly row (initials motif, no cover photo) ---------------- */
const FriendlyRow = React.memo(function FriendlyRow({ id, index, title, detail, confirmed, isLast, onPress }: { id: string; index: number; title: string; detail: string; confirmed: boolean; isLast: boolean; onPress: (id: string) => void }) {
  const C = useScreenColors();
  const tilt = index % 2 === 0 ? -4 : 4;
  return (
    <Pressable onPress={() => onPress(id)} accessibilityRole="button" accessibilityLabel={title} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.cardBorder }}>
      <View style={{ width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.purpleDeep, borderWidth: 1.5, borderColor: "rgba(198,248,42,0.5)", transform: [{ rotate: `${tilt}deg` }] }}>
        <Icon name="users" size={18} color={C.lime} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{title}</Text>
        <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 1 }}>{detail}</Text>
      </View>
      <FriendlyStatusPill C={C} accepted={confirmed} />
    </Pressable>
  );
});

// Same visual pattern as the status pill on the "Meus amistosos" list screen
// (dot + tinted pill) — kept consistent instead of the generic Badge here.
function FriendlyStatusPill({ C, accepted }: { C: ReturnType<typeof useScreenColors>; accepted: boolean }) {
  const color = accepted ? (C.isDark ? C.lime : C.purple) : "#FBBF24";
  const bg = accepted ? C.limeTintBg : "rgba(251,191,36,0.14)";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: bg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
      <Text style={{ color, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>{accepted ? "ACEITO" : "PENDENTE"}</Text>
    </View>
  );
}

/* ---------------- Empty state (icon motif + purple CTA) ---------------- */
function EmptyState({ icon, title, body, ctaLabel, onCta }: { icon: any; title: string; body: string; ctaLabel?: string; onCta?: () => void }) {
  const C = useScreenColors();
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 20, alignItems: "center", marginBottom: 20 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.purpleTintBg, borderWidth: 1.5, borderColor: C.limeTintBorder }}>
        <Icon name={icon} size={28} color={C.isDark ? C.lime : C.purple} />
      </View>
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>{title}</Text>
      <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19, textAlign: "center", maxWidth: 250, marginBottom: ctaLabel ? 14 : 0 }}>{body}</Text>
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={{ backgroundColor: C.purple, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 13 }}>
          <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------- Loading skeleton ---------------- */
function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <View>
          <Skeleton width={70} height={12} radius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={150} height={26} radius={8} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton width={44} height={44} radius={14} />
          <Skeleton width={44} height={44} radius={14} />
        </View>
      </View>

      <Skeleton height={150} radius={20} style={{ marginBottom: 2 }} />
      <Skeleton height={90} radius={20} style={{ marginTop: 2, marginBottom: 12 }} />
      <Skeleton height={50} radius={16} style={{ marginBottom: 26 }} />

      <Skeleton width={180} height={22} radius={8} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 26 }}>
        <View style={{ width: 150 }}>
          <Skeleton height={92} radius={14} style={{ marginBottom: 12 }} />
          <Skeleton width={120} height={14} radius={6} style={{ marginBottom: 6 }} />
          <Skeleton width={80} height={10} radius={5} />
        </View>
        <View style={{ width: 150 }}>
          <Skeleton height={92} radius={14} style={{ marginBottom: 12 }} />
          <Skeleton width={120} height={14} radius={6} style={{ marginBottom: 6 }} />
          <Skeleton width={80} height={10} radius={5} />
        </View>
      </View>

      <Skeleton width={150} height={22} radius={8} style={{ marginBottom: 16 }} />
      <Skeleton height={150} radius={18} />
    </View>
  );
}
