import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { teamsService } from "@/services/teamsService";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTC, VolleyballIcon } from "../tournaments/_tournamentKit";

interface TeamCard {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  format: string;
  modality: string;
  isOwner: boolean;
  stats: { tournaments: number; wins: number; winRate: string };
  members: { initials: string; avatarUrl: string | null }[];
  memberCount: number;
}

interface PendingInvite {
  id: string;
  teamName: string;
  teamInitials: string;
  teamAvatarUrl: string | null;
  format: string;
  inviterUsername: string;
}

function BackButton({ onPress }: { onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name="back" size={19} color={TC.tx2} strokeWidth={2.2} />
    </Pressable>
  );
}

function TeamAvatar({ uri, initials, size = 52, tilt = -3 }: { uri: string | null; initials: string; size?: number; tilt?: number }) {
  const TC = useTC();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: "hidden", borderWidth: 2, borderColor: TC.lime, transform: [{ rotate: `${tilt}deg` }], backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center" }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: size * 0.34 }}>{initials}</Text>
      )}
    </View>
  );
}

const TeamCardRow = React.memo(function TeamCardRow({ team, onPress }: { team: TeamCard; onPress: (id: string) => void }) {
  const TC = useTC();
  return (
    <Pressable
      onPress={() => onPress(team.id)}
      accessibilityRole="button"
      accessibilityLabel={`Time ${team.name}`}
      style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 20, padding: 18, marginBottom: 14 }}
    >
      {/* Team header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <TeamAvatar uri={team.avatarUrl} initials={team.initials} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase" }}>
            {team.name}
          </Text>
          <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 }}>
            {team.format} · {team.modality}
          </Text>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.tx3} strokeWidth={2}>
          <Path d="m9 6 6 6-6 6" />
        </Svg>
      </View>

      {/* Stats row — first tile purple-feature */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {[
          { value: team.stats.tournaments, label: "Torneios", feature: true },
          { value: team.stats.wins, label: "Vitórias", feature: false },
          { value: team.stats.winRate, label: "Win rate", feature: false },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: stat.feature ? TC.purple : TC.purpleTintBg, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: stat.feature ? TC.lime : (TC.isDark ? TC.lime : TC.purple), fontFamily: "Anton_400Regular", fontSize: 19 }}>
              {stat.value}
            </Text>
            <Text style={{ color: stat.feature ? "rgba(255,255,255,0.75)" : TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase" }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Members row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {team.members.map((m, i) => (
            <View
              key={m.initials + i}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: m.avatarUrl ? undefined : (i === 0 ? TC.purpleDeep : "rgba(255,255,255,0.08)"),
                borderWidth: 2, borderColor: TC.card,
                alignItems: "center", justifyContent: "center",
                marginLeft: i === 0 ? 0 : -8,
                overflow: "hidden",
              }}
            >
              {m.avatarUrl ? (
                <Image source={{ uri: m.avatarUrl }} style={{ width: 28, height: 28, borderRadius: 14 }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Text style={{ color: i === 0 ? TC.lime : TC.tx2, fontFamily: "Oswald_700Bold", fontSize: 9 }}>{m.initials}</Text>
              )}
            </View>
          ))}
        </View>
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 11 }}>
          {team.memberCount} jogadores
        </Text>
        <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: TC.limeTintBg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: TC.isDark ? TC.lime : TC.purple }} />
          <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>ATIVO</Text>
        </View>
      </View>
    </Pressable>
  );
});

export function ManageTeamsScreen({ navigation }: any) {
  const TC = useTC();
  const user = useAuthStore((s) => s.user);

  const { data: teamsData, loading: loadingTeams, error, refetch: refetchTeams } = useApi(() => teamsService.list(), []);
  const { data: invitesData, loading: loadingInvites, refetch: refetchInvites } = useApi(() => teamsService.getPendingInvitations(), []);
  const loading = loadingTeams || loadingInvites;
  const refetch = async (opts?: { keepData?: boolean }) => { await Promise.all([refetchTeams(opts), refetchInvites(opts)]); };
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, []));

  const teams: TeamCard[] = useMemo(() => (teamsData ?? []).map(t => ({
    id: t.id,
    name: t.name,
    initials: t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    avatarUrl: t.avatarUrl,
    format: "Dupla",
    modality: "Areia",
    isOwner: t.ownerId === user?.id,
    stats: {
      tournaments: t.stats?.tournaments ?? 0,
      wins: t.stats?.wins ?? 0,
      winRate: t.stats?.winRate != null ? `${t.stats.winRate}%` : "0%",
    },
    members: t.members?.slice(0, 4).map(m => ({
      initials: m.user.name.split(" ").map(w => w[0]).join("").slice(0, 2),
      avatarUrl: m.user.avatarUrl,
    })) ?? [],
    memberCount: t._count?.members ?? t.members?.length ?? 0,
  })), [teamsData, user?.id]);

  const invites: PendingInvite[] = useMemo(() => (invitesData ?? []).map(inv => ({
    id: inv.id,
    teamName: inv.team.name,
    teamInitials: inv.team.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    teamAvatarUrl: inv.team.avatarUrl,
    format: "Dupla",
    inviterUsername: inv.inviter.username ? `@${inv.inviter.username}` : inv.inviter.name,
  })), [invitesData]);

  const handleAcceptInvite = useCallback(async (id: string) => {
    try { await teamsService.acceptInvitation(id); refetch(); } catch {}
  }, []);

  const handleRejectInvite = useCallback(async (id: string) => {
    try { await teamsService.rejectInvitation(id); refetch(); } catch {}
  }, []);

  const goToTeam = useCallback((id: string) => navigation?.navigate("TeamDetail", { id }), [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BackButton onPress={() => navigation?.goBack()} />
            <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Meus times
            </Text>
          </View>
          <Pressable
            onPress={() => navigation?.navigate("CreateTeam")}
            accessibilityRole="button"
            accessibilityLabel="Criar time"
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: TC.purple, alignItems: "center", justifyContent: "center" }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TC.tx} strokeWidth={2.6}>
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <FlatList
        style={{ paddingHorizontal: 22 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && !!teamsData} onRefresh={refetch} tintColor={TC.lime} />}
        data={teams}
        keyExtractor={(team) => team.id}
        renderItem={({ item }) => <TeamCardRow team={item} onPress={goToTeam} />}
        ListHeaderComponent={
          <>
            {/* Loading skeletons */}
            {loading && !teamsData && (
              <View style={{ gap: 14, marginTop: 4 }}>
                <Skeleton height={186} radius={20} />
                <Skeleton height={186} radius={20} />
              </View>
            )}

            {/* Error */}
            {error && !teamsData && (
              <View style={{ alignItems: "center", paddingVertical: 60 }}>
                <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 12 }}>{error}</Text>
                <Pressable onPress={() => refetch()} accessibilityRole="button">
                  <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
                </Pressable>
              </View>
            )}

            {/* Empty state */}
            {!loading && teamsData && teams.length === 0 && invites.length === 0 && (
              <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 20, padding: 28, alignItems: "center", marginTop: 20 }}>
                <View style={{ width: 68, height: 68, borderRadius: 18, borderWidth: 2, borderColor: "rgba(198,248,42,0.5)", transform: [{ rotate: "-4deg" }], backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <VolleyballIcon size={30} color={TC.lime} />
                </View>
                <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 8 }}>
                  Nenhum time ainda
                </Text>
                <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 260, marginBottom: 18 }}>
                  Crie um time para participar de torneios e amistosos.
                </Text>
                <Pressable
                  onPress={() => navigation?.navigate("CreateTeam")}
                  accessibilityRole="button"
                  style={{ paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14, backgroundColor: TC.purple }}
                >
                  <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>Criar time</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          invites.length > 0 ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 12 }}>
                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: TC.lime }} />
                <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>
                  Convites pendentes
                </Text>
              </View>
              {invites.map((inv) => (
                <View
                  key={inv.id}
                  style={{ backgroundColor: "rgba(124,58,237,0.08)", borderWidth: 1, borderColor: "rgba(124,58,237,0.25)", borderRadius: 18, padding: 16, marginBottom: 14 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <TeamAvatar uri={inv.teamAvatarUrl} initials={inv.teamInitials} size={44} tilt={-2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 14, letterSpacing: 0.3, textTransform: "uppercase" }}>
                        {inv.teamName}
                      </Text>
                      <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 11 }}>
                        {inv.format} · Convite de {inv.inviterUsername}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => handleAcceptInvite(inv.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Aceitar convite ${inv.teamName}`}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: TC.purple, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Aceitar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRejectInvite(inv.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Recusar convite ${inv.teamName}`}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: TC.cardBorder, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: TC.tx2, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Recusar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
