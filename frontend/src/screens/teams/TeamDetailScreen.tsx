import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { teamsService } from "@/services/teamsService";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTC } from "../tournaments/_tournamentKit";

interface Member {
  id: string;
  userId: string;
  name: string;
  initials: string;
  username: string;
  isCaptain: boolean;
  avatarUrl: string | null;
  isFirst: boolean;
}

function IconButton({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={icon} size={18} color={TC.tx2} strokeWidth={2} />
    </Pressable>
  );
}

export function TeamDetailScreen({ navigation, route }: any) {
  const TC = useTC();
  const id = route?.params?.id;

  const { data: team, loading, error, refetch } = useApi(() => teamsService.findOne(id), [id]);

  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  const teamName = team?.name ?? "";
  const teamInitials = teamName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const teamFormat = team?.description ?? "Dupla · Areia";

  const members: Member[] = (team?.members ?? []).map((m, i) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    initials: m.user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    username: m.user.username ? `@${m.user.username}` : m.user.email,
    isCaptain: m.isCaptain,
    avatarUrl: m.user.avatarUrl,
    isFirst: i === 0,
  }));

  const stats = [
    { value: String(team?.stats?.tournaments ?? 0), label: "Torneios" },
    { value: String(team?.stats?.wins ?? 0), label: "Vitórias" },
    { value: team?.stats?.winRate != null ? `${team.stats.winRate}%` : "0%", label: "Win rate" },
  ];

  if (loading && !team) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
            <Skeleton width={40} height={40} radius={14} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Skeleton width={40} height={40} radius={14} />
              <Skeleton width={40} height={40} radius={14} />
            </View>
          </View>
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Skeleton width={72} height={72} radius={22} style={{ marginBottom: 12 }} />
            <Skeleton width={160} height={22} radius={6} />
          </View>
          <Skeleton height={80} radius={18} style={{ marginBottom: 20 }} />
          <Skeleton height={60} radius={14} style={{ marginBottom: 10 }} />
          <Skeleton height={60} radius={14} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !team) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={() => refetch()} accessibilityRole="button">
          <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 22, paddingTop: 14 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={TC.lime} />}>
        {/* Header with back + edit */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <IconButton icon="back" label="Voltar" onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation.replace("MainTabs")} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton
              icon="share"
              label="Compartilhar"
              onPress={async () => {
                try {
                  await Share.share({ message: `Confira o time ${teamName} no ToquePlay!\ntoqueplay://team/${id}` });
                } catch {}
              }}
            />
            <Pressable
              onPress={() => navigation.navigate("CreateTeam", { teamId: id })}
              accessibilityRole="button"
              accessibilityLabel="Editar time"
              style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, borderRadius: 14, paddingHorizontal: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder }}
            >
              <Icon name="edit" size={16} color={TC.tx2} strokeWidth={2} />
              <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}>Editar</Text>
            </Pressable>
          </View>
        </View>

        {/* Team avatar + name — framed tilt */}
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          <View style={{ width: 78, height: 78, borderRadius: 22, overflow: "hidden", borderWidth: 2.5, borderColor: TC.lime, transform: [{ rotate: "-3deg" }], backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            {team?.avatarUrl ? (
              <Image source={{ uri: team.avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 26 }}>{teamInitials}</Text>
            )}
          </View>
          <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center" }}>{teamName}</Text>
          <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, marginTop: 4 }}>{teamFormat}</Text>
        </View>

        {/* Stats bar */}
        <View style={{ flexDirection: "row", backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 18, marginBottom: 22 }}>
          {stats.map((stat, i, arr) => (
            <View key={stat.label} style={{
              flex: 1, alignItems: "center", paddingVertical: 16,
              borderRightWidth: i < arr.length - 1 ? 1 : 0,
              borderRightColor: TC.cardBorder,
            }}>
              <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 24 }}>{stat.value}</Text>
              <Text style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 3 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Members */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: TC.lime }} />
            <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>Jogadores</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("AddTeamMember", { teamId: id, teamName })} accessibilityRole="button" accessibilityLabel="Convidar jogador">
            <Text style={{ color: TC.lime, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>+ Convidar</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => navigation?.navigate("AthleteProfile", { id: m.userId })}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder,
                borderRadius: 14, padding: 12, paddingHorizontal: 14,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 13, overflow: "hidden",
                borderWidth: m.isFirst ? 2 : 0, borderColor: TC.lime,
                backgroundColor: m.isFirst ? TC.purpleDeep : "rgba(255,255,255,0.06)",
                alignItems: "center", justifyContent: "center",
              }}>
                {m.avatarUrl ? (
                  <Image source={{ uri: m.avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <Text style={{ color: m.isFirst ? TC.lime : TC.tx2, fontFamily: "Oswald_700Bold", fontSize: 12 }}>{m.initials}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{m.name}</Text>
                <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{m.username}</Text>
              </View>
              <View style={{
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: m.isCaptain ? TC.limeTintBg : "rgba(255,255,255,0.06)",
              }}>
                <Text style={{
                  color: m.isCaptain ? (TC.isDark ? TC.lime : TC.purple) : TC.tx3,
                  fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.6,
                }}>
                  {m.isCaptain ? "CAPITÃO" : "MEMBRO"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* History */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: TC.lime }} />
          <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4 }}>HISTÓRICO</Text>
        </View>
        <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 16, paddingVertical: 24, marginBottom: 24 }}>
          <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center" }}>
            Sem histórico
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
