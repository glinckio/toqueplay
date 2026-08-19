import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { teamsService } from "@/services/teamsService";

interface Member {
  id: string;
  name: string;
  initials: string;
  username: string;
  isCaptain: boolean;
  colorBg: string;
  colorText: string;
  isGradient?: boolean;
}

export function TeamDetailScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const id = route?.params?.id;
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";

  const { data: team, loading, error, refetch } = useApi(() => teamsService.findOne(id), [id]);

  const teamName = team?.name ?? "";
  const teamInitials = teamName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const teamFormat = team?.description ?? "Dupla · Areia";

  const members: Member[] = (team?.members ?? []).map((m, i) => ({
    id: m.id,
    name: m.user.name,
    initials: m.user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    username: m.user.username ? `@${m.user.username}` : m.user.email,
    isCaptain: m.isCaptain,
    colorBg: i === 0 ? "" : "#221B33",
    colorText: i === 0 ? "#fff" : "#CFC8E0",
    isGradient: i === 0,
  }));

  const stats = [
    { value: String(team?.stats?.tournaments ?? 0), label: "Torneios" },
    { value: String(team?.stats?.wins ?? 0), label: "Vitórias" },
    { value: team?.stats?.winRate != null ? `${team.stats.winRate}%` : "0%", label: "Win rate" },
  ];

  if (loading && !team) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !team) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 22, paddingTop: 14 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}>
        {/* Header with back + edit */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation?.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Editar time"
            style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2}>
              <Path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </Svg>
            <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Editar</Text>
          </Pressable>
        </View>

        {/* Team avatar + name */}
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          <LinearGradient
            colors={["#8B5CF6", "#6D3BEA"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              alignItems: "center", justifyContent: "center", marginBottom: 12,
              shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 28, elevation: 6,
            }}
          >
            <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 26, fontWeight: "700" }}>{teamInitials}</Text>
          </LinearGradient>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>{teamName}</Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", marginTop: 4 }}>{teamFormat}</Text>
        </View>

        {/* Stats bar */}
        <View style={{
          flexDirection: "row",
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 18, marginBottom: 20,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          {stats.map((stat, i, arr) => (
            <View key={stat.label} style={{
              flex: 1, alignItems: "center", paddingVertical: 16,
              borderRightWidth: i < arr.length - 1 ? 1 : 0,
              borderRightColor: dividerColor,
            }}>
              <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>{stat.value}</Text>
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Members */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>JOGADORES</Text>
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Convidar jogador">
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>+ Convidar</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {members.map((m) => (
            <View
              key={m.id}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 14, padding: 12, paddingHorizontal: 14,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 1 }),
              }}
            >
              {m.isGradient ? (
                <LinearGradient
                  colors={["#8B5CF6", "#6D3BEA"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{m.initials}</Text>
                </LinearGradient>
              ) : (
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: isDark ? m.colorBg : "#F0ECFA",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ color: isDark ? m.colorText : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{m.initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>{m.name}</Text>
                <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{m.username}</Text>
              </View>
              <View style={{
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: m.isCaptain
                  ? (isDark ? "rgba(198,248,42,.12)" : "#EAF7C4")
                  : (isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.05)"),
              }}>
                <Text style={{
                  color: m.isCaptain
                    ? (isDark ? "#C6F82A" : "#5C7A00")
                    : (isDark ? "#6E6684" : "#9488A6"),
                  fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700",
                }}>
                  {m.isCaptain ? "CAPITÃO" : "MEMBRO"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* History */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>HISTÓRICO</Text>
        </View>
        <View style={{ gap: 10, marginBottom: 24 }}>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", textAlign: "center", paddingVertical: 20 }}>
            Sem histórico
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
