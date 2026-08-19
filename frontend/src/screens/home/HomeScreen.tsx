import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useApi } from "@/hooks/useApi";
import { homeService } from "@/services/homeService";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import Svg, { Path, Polyline } from "react-native-svg";

const LIVE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=760&q=72&auto=format&fit=crop";

const TOURNAMENT_IMAGES = [
  "https://images.unsplash.com/photo-1749960695051-e103bd0825f9?fm=jpg&w=360&q=65&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530869685324-333806073961?fm=jpg&w=360&q=65&auto=format&fit=crop",
];

interface LiveMatch {
  tournament: string;
  subtitle: string;
  court: string;
  set: number;
  teamA: { initials: string; name: string; color: string };
  teamB: { initials: string; name: string; color: string; borderOnly?: boolean };
  score: { a: number; b: number };
  setScores: string;
}

interface NearbyTournament {
  image: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  name: string;
  distance: string;
}

interface MyTournament {
  image: string;
  name: string;
  detail: string;
  status: "paid" | "pending";
}

export function HomeScreen() {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "Jogador";
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0E0B14" : "#F6F4FC";
  const metaColor = isDark ? "#A9A2BC" : "#6B6480";

  const { data: dashboard, loading, error, refetch } = useApi(() => homeService.getDashboard(), []);

  const liveMatch = dashboard?.liveMatches?.[0] ?? null;
  const hasLive = !!liveMatch;
  const nearbyTournaments = dashboard?.nearbyTournaments ?? [];
  const hasNearby = nearbyTournaments.length > 0;
  const myTournaments = dashboard?.myTournaments ?? [];
  const hasMyTournaments = myTournaments.length > 0;

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={refetch} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: accentColor }}>
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 96 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <View>
            <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500", marginBottom: 2 }}>
              Olá, {firstName}
            </Text>
            <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 21, fontWeight: "700", lineHeight: 23, letterSpacing: -0.01 * 21 }}>
              Pronto pra jogar?
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => navigation.navigate("Notifications")}
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              style={{
                position: "relative",
                width: 42, height: 42, borderRadius: 14,
                backgroundColor: isDark ? "#1C1630" : "#FFFFFF",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)",
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "rgba(26,16,48,0.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 }),
              }}
            >
              <Icon name="bell" size={18} color={isDark ? "#CFC8E0" : "#4A4460"} />
              {(dashboard?.unreadNotifications ?? 0) > 0 && (
                <View style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? "#FF4D5E" : "#E83A4C", borderWidth: 2, borderColor: isDark ? "#1C1630" : "#FFFFFF" }} />
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.getParent()?.navigate("Profile")}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
              style={{ width: 42, height: 42, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "#7C3AED" }}
            >
              <Image source={{ uri: "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=120&q=60&auto=format&fit=crop&crop=faces" }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </Pressable>
          </View>
        </View>

        {/* Live Hero or Empty State */}
        {hasLive && liveMatch ? (
          <LiveHeroSection match={{
            tournament: liveMatch.tournament.name,
            subtitle: liveMatch.round,
            court: liveMatch.court,
            set: liveMatch.currentSet,
            teamA: { initials: liveMatch.teamA.initials, name: liveMatch.teamA.name, color: "#7C3AED" },
            teamB: { initials: liveMatch.teamB.initials, name: liveMatch.teamB.name, color: "#241B38", borderOnly: true },
            score: { a: liveMatch.scoreA, b: liveMatch.scoreB },
            setScores: liveMatch.setScores,
          }} isDark={isDark} accentColor={accentColor} />
        ) : (
          <EmptyLiveState isDark={isDark} />
        )}

        {/* ASSISTIR AGORA button */}
        {hasLive && (
          <Pressable
            onPress={() => navigation.navigate("MatchResult", { matchId: liveMatch?.id ?? "live-1" })}
            accessibilityRole="button"
            accessibilityLabel="Assistir agora"
            style={{
              width: "100%",
              backgroundColor: accentColor,
              paddingVertical: 14, borderRadius: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
              marginBottom: 16,
              ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill={isDark ? "#12100A" : "#fff"}>
              <Path d="M8 5v14l11-7z" />
            </Svg>
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
              ASSISTIR AGORA
            </Text>
          </Pressable>
        )}

        {/* Torneios próximos */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 13 }}>
          <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700" }}>Torneios próximos</Text>
          <Pressable onPress={() => navigation.getParent()?.navigate("Explore")} accessibilityRole="button" accessibilityLabel="Ver todos torneios">
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Ver todos</Text>
          </Pressable>
        </View>

        {hasNearby ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}>
            {nearbyTournaments.map((t) => (
              <NearbyCard key={t.id} tournament={{
                image: t.coverUrl || TOURNAMENT_IMAGES[0],
                badge: t.categoryFormat,
                badgeBg: "rgba(124,58,237,.92)",
                badgeColor: "#fff",
                name: t.name,
                distance: `${t.distance} km · ${t.date}`,
              }} isDark={isDark} onPress={() => navigation.navigate("TournamentDetail", { id: t.id })} />
            ))}
          </ScrollView>
        ) : (
          <EmptyNearbyState isDark={isDark} />
        )}

        {/* Meus torneios */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700" }}>Meus torneios</Text>
          <Pressable onPress={() => navigation.navigate("MyTournaments")} accessibilityRole="button" accessibilityLabel="Ver todos meus torneios">
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Ver todos</Text>
          </Pressable>
        </View>

        {hasMyTournaments ? (
          myTournaments.map((t, i) => (
            <MyTournamentRow key={t.id} tournament={{
              image: t.coverUrl || TOURNAMENT_IMAGES[0],
              name: t.name,
              detail: `${t.date} · ${t.categoryFormat}`,
              status: t.registrationStatus === "PAID" ? "paid" : "pending",
            }} isDark={isDark} isLast={i === myTournaments.length - 1} onPress={() => navigation.navigate("TournamentDetail", { id: t.id })} />
          ))
        ) : (
          <EmptyMyTournamentsState isDark={isDark} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveHeroSection({ match, isDark, accentColor }: { match: LiveMatch; isDark: boolean; accentColor: string }) {
  return (
    <View style={{ position: "relative", marginBottom: 46 }}>
      <View style={{ position: "relative", borderRadius: 24, overflow: "hidden", height: 166, borderWidth: isDark ? 1 : 0, borderColor: "rgba(255,255,255,0.08)" }}>
        <Image source={{ uri: LIVE_HERO_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient
          colors={isDark
            ? ["rgba(14,11,20,0.45)", "rgba(14,11,20,0.1)", "rgba(14,11,20,0.9)"]
            : ["rgba(20,10,38,0.4)", "rgba(20,10,38,0.08)", "rgba(20,10,38,0.88)"]
          }
          locations={[0, 0.42, 1]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        {/* Live badge */}
        <View style={{
          position: "absolute", top: 13, left: 13,
          flexDirection: "row", alignItems: "center", gap: 7,
          backgroundColor: "rgba(255,77,94,0.2)",
          borderWidth: 1,
          borderColor: "rgba(255,77,94,0.55)",
          paddingVertical: 6, paddingHorizontal: 11, borderRadius: 20,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FF4D5E" }} />
          <Text style={{ color: "#FF9CA6", fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700", letterSpacing: 0.06 * 11 }}>
            AO VIVO · SET {match.set}
          </Text>
        </View>
        {/* Court */}
        <View style={{ position: "absolute", top: 13, right: 13, backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.22)", paddingVertical: 6, paddingHorizontal: 11, borderRadius: 20 }}>
          <Text style={{ color: "#F5F3FA", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>{match.court}</Text>
        </View>
        {/* Title */}
        <View style={{ position: "absolute", left: 16, right: 16, top: 48 }}>
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", lineHeight: 24, letterSpacing: -0.01 * 24 }}>{match.tournament}</Text>
          <Text style={{ color: isDark ? "#C6F82A" : "#DFFF7A", fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 12, fontWeight: "600", letterSpacing: 0.05 * 12, marginTop: 4 }}>{match.subtitle}</Text>
        </View>
      </View>

      {/* Floating score capsule */}
      <View style={{
        position: "absolute", left: 12, right: 12, bottom: -42,
        backgroundColor: isDark ? "#171221" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.06)",
        borderRadius: 20, padding: 14,
        flexDirection: "row", alignItems: "center",
        shadowColor: isDark ? "rgba(0,0,0,0.75)" : "rgba(46,16,101,0.35)",
        shadowOffset: { width: 0, height: 20 }, shadowOpacity: 1, shadowRadius: 40, elevation: 10,
      }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: match.teamA.color, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
            <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>{match.teamA.initials}</Text>
          </View>
          <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>{match.teamA.name}</Text>
        </View>
        <View style={{ alignItems: "center", paddingHorizontal: 6 }}>
          <Text style={{ color: isDark ? "#fff" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 32, fontWeight: "700", lineHeight: 32, letterSpacing: -0.02 * 32 }}>
            {match.score.a}<Text style={{ color: isDark ? "#6E6684" : "#C3BCD4" }}>  :  </Text>{match.score.b}
          </Text>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 3 }}>{match.setScores}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: isDark ? match.teamB.color : "#F0ECFA",
            borderWidth: match.teamB.borderOnly && isDark ? 1 : 0,
            borderColor: "rgba(255,255,255,0.12)",
            alignItems: "center", justifyContent: "center", marginBottom: 6,
          }}>
            <Text style={{ color: isDark ? "#fff" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>{match.teamB.initials}</Text>
          </View>
          <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>{match.teamB.name}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyLiveState({ isDark }: { isDark: boolean }) {
  return (
    <View style={{
      borderWidth: 1, borderStyle: "dashed",
      borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(26,16,48,0.16)",
      borderRadius: 20, padding: 13, paddingHorizontal: 18, alignItems: "center", marginBottom: 12,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? "#171221" : "#F0ECFA", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name="pulse" size={22} color={isDark ? "#6E6684" : "#A29CB4"} />
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", marginBottom: 4 }}>Nenhuma partida ao vivo</Text>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12.5, fontWeight: "500", lineHeight: 19, textAlign: "center", maxWidth: 230 }}>
        Quando um jogo seu começar, o placar aparece aqui.
      </Text>
    </View>
  );
}

function NearbyCard({ tournament, isDark, onPress }: { tournament: NearbyTournament; isDark: boolean; onPress?: () => void }) {
  return (
    <Pressable style={{ width: 150 }} onPress={onPress} accessibilityRole="button" accessibilityLabel={tournament.name}>
      <View style={{ height: 82, borderRadius: 16, overflow: "hidden", position: "relative", marginBottom: 8 }}>
        <Image source={{ uri: tournament.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: tournament.badgeBg, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 7 }}>
          <Text style={{ color: tournament.badgeColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>{tournament.badge}</Text>
        </View>
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>{tournament.name}</Text>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>{tournament.distance}</Text>
    </Pressable>
  );
}

function EmptyNearbyState({ isDark }: { isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? "#171221" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.06)",
      borderRadius: 18, padding: 13, alignItems: "center", marginBottom: 12,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? "#241B38" : "#F0ECFA", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name="location" size={22} color={isDark ? "#8B5CF6" : "#7C3AED"} />
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>Nada por perto ainda</Text>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12.5, fontWeight: "500", lineHeight: 19, textAlign: "center", maxWidth: 250, marginBottom: 12 }}>
        Ative a localização para descobrir torneios na sua região.
      </Text>
      <Pressable style={{
        borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(26,16,48,0.1)",
        backgroundColor: "transparent", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12,
      }}>
        <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>Ativar localização</Text>
      </Pressable>
    </View>
  );
}

function MyTournamentRow({ tournament, isDark, isLast, onPress }: { tournament: MyTournament; isDark: boolean; isLast: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tournament.name} style={{
      flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)",
    }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, overflow: "hidden" }}>
        <Image source={{ uri: tournament.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700" }}>{tournament.name}</Text>
        <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{tournament.detail}</Text>
      </View>
      <Badge status={tournament.status} size="md" />
    </Pressable>
  );
}

function EmptyMyTournamentsState({ isDark }: { isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? "#171221" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.06)",
      borderRadius: 18, padding: 13, alignItems: "center",
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? "#241B38" : "#F0ECFA", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name="trophy" size={22} color={isDark ? "#C6F82A" : "#7C3AED"} />
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>Você ainda não se inscreveu</Text>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12.5, fontWeight: "500", lineHeight: 19, textAlign: "center", maxWidth: 250, marginBottom: 12 }}>
        Encontre um torneio e inscreva seu time para vê-lo aqui.
      </Text>
      <Pressable
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Explorar torneios"
        style={{
          backgroundColor: "#7C3AED",
          paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>Explorar torneios</Text>
      </Pressable>
    </View>
  );
}
