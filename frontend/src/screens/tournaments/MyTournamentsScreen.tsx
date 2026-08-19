import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { tournamentsService, TournamentDTO } from "@/services/tournamentsService";

type FilterTab = "all" | "draft" | "active" | "finished";

interface TournamentItem {
  id: string;
  name: string;
  date: string;
  location: string;
  status: "open" | "draft" | "in_progress" | "finished";
  enrolledCount: number;
  teamAvatars?: { initials: string; bg: string; color: string }[];
  actionLabel: string;
  gradientColors: [string, string];
}

const DARK_TOURNAMENTS: TournamentItem[] = [
  {
    id: "1", name: "Copa Verão Beach 2026", date: "15 Ago 2026", location: "Praia Grande, SP",
    status: "open", enrolledCount: 12, actionLabel: "Gerenciar →",
    gradientColors: ["#2D1B69", "#1A1030"],
    teamAvatars: [
      { initials: "AB", bg: "#2D1B69", color: "#C6F82A" },
      { initials: "TP", bg: "#1C4A3D", color: "#34D399" },
      { initials: "RJ", bg: "#4A1942", color: "#F472B6" },
    ],
  },
  {
    id: "2", name: "Circuito Indoor SP", date: "Sem data definida", location: "São Paulo, SP",
    status: "draft", enrolledCount: 0, actionLabel: "Editar →",
    gradientColors: ["#1A1030", "#0E0B14"],
  },
  {
    id: "3", name: "Liga Municipal Vôlei", date: "10 Ago 2026", location: "Guarujá, SP",
    status: "in_progress", enrolledCount: 8, actionLabel: "Ver partidas →",
    gradientColors: ["#1B3A2D", "#0E1A14"],
    teamAvatars: [
      { initials: "VB", bg: "#2D1B69", color: "#C6F82A" },
      { initials: "PA", bg: "#1C4A3D", color: "#34D399" },
      { initials: "+5", bg: "#3D2A1A", color: "#FBBF24" },
    ],
  },
];

const LIGHT_TOURNAMENTS: TournamentItem[] = [
  {
    id: "1", name: "Copa Verão Beach 2026", date: "15 Ago 2026", location: "Praia Grande, SP",
    status: "open", enrolledCount: 12, actionLabel: "Gerenciar →",
    gradientColors: ["#E8DEFF", "#F6F4FC"],
    teamAvatars: [
      { initials: "AB", bg: "#E8DEFF", color: "#7C3AED" },
      { initials: "TP", bg: "#D1FAE5", color: "#059669" },
      { initials: "RJ", bg: "#FCE7F3", color: "#DB2777" },
    ],
  },
  {
    id: "2", name: "Circuito Indoor SP", date: "Sem data definida", location: "São Paulo, SP",
    status: "draft", enrolledCount: 0, actionLabel: "Editar →",
    gradientColors: ["#ECEAF4", "#F6F4FC"],
  },
  {
    id: "3", name: "Liga Municipal Vôlei", date: "10 Ago 2026", location: "Guarujá, SP",
    status: "in_progress", enrolledCount: 8, actionLabel: "Ver partidas →",
    gradientColors: ["#D1FAE5", "#F0FDF4"],
    teamAvatars: [
      { initials: "VB", bg: "#E8DEFF", color: "#7C3AED" },
      { initials: "PA", bg: "#D1FAE5", color: "#059669" },
      { initials: "+5", bg: "#FEF3C7", color: "#D97706" },
    ],
  },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "draft", label: "Rascunho" },
  { key: "active", label: "Ativo" },
  { key: "finished", label: "Encerrado" },
];

function getStatusBadge(status: TournamentItem["status"], isDark: boolean) {
  switch (status) {
    case "open":
      return {
        label: "INSCRIÇÕES ABERTAS",
        bg: isDark ? "rgba(198,248,42,0.15)" : "rgba(124,58,237,0.1)",
        color: isDark ? "#C6F82A" : "#7C3AED",
        dot: isDark ? "#C6F82A" : "#7C3AED",
      };
    case "draft":
      return {
        label: "RASCUNHO",
        bg: isDark ? "rgba(110,102,132,0.15)" : "rgba(26,16,48,0.06)",
        color: isDark ? "#948CA8" : "#8A829E",
      };
    case "in_progress":
      return {
        label: "EM ANDAMENTO",
        bg: isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.1)",
        color: isDark ? "#34D399" : "#059669",
        dot: isDark ? "#34D399" : "#059669",
      };
    case "finished":
      return {
        label: "ENCERRADO",
        bg: isDark ? "rgba(110,102,132,0.12)" : "rgba(26,16,48,0.06)",
        color: isDark ? "#6E6684" : "#8A829E",
      };
  }
}

function mapTournaments(data: TournamentDTO[], isDark: boolean): TournamentItem[] {
  return data.map((t) => {
    const statusMap: Record<string, TournamentItem["status"]> = {
      DRAFT: "draft",
      OPEN: "open",
      IN_PROGRESS: "in_progress",
      COMPLETED: "finished",
    };
    const status = statusMap[t.status] ?? "draft";
    const actionMap: Record<TournamentItem["status"], string> = {
      open: "Gerenciar →",
      draft: "Editar →",
      in_progress: "Ver partidas →",
      finished: "Ver resultado →",
    };
    return {
      id: t.id,
      name: t.name,
      date: t.date ? new Date(t.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }) : "Sem data definida",
      location: [t.city, t.state].filter(Boolean).join(", ") || "",
      status,
      enrolledCount: t._count?.registrations ?? 0,
      actionLabel: actionMap[status],
      gradientColors: isDark ? ["#2D1B69", "#1A1030"] : ["#E8DEFF", "#F6F4FC"],
    };
  });
}

export function MyTournamentsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const bgBase = isDark ? "#0C0A12" : "#F6F4FC";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)";
  const metaColor = isDark ? "#948CA8" : "#6B6480";
  const metaIcon = isDark ? "#6E6684" : "#A29CB4";

  const { data: rawTournaments, loading, error, refetch } = useApi(() => tournamentsService.findMine(), []);
  const tournaments = mapTournaments(rawTournaments ?? [], isDark);

  if (loading && !rawTournaments) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !rawTournaments) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => navigation?.goBack()}
              style={{
                width: 40, height: 40, borderRadius: 14,
                backgroundColor: isDark ? "#171320" : "#fff",
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)",
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
              }}
            >
              <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} />
            </Pressable>
            <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22 }}>Meus torneios</Text>
          </View>
          <Pressable style={{
            width: 40, height: 40, borderRadius: 14,
            backgroundColor: accentColor,
            alignItems: "center", justifyContent: "center",
            ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 }),
          }}>
            <Icon name="plus" size={20} color={isDark ? "#12100A" : "#fff"} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={{
                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
                backgroundColor: activeFilter === tab.key ? accentColor : (isDark ? "#141019" : "#fff"),
                ...(activeFilter !== tab.key ? { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)" } : {}),
              }}
            >
              <Text style={{
                fontFamily: activeFilter === tab.key ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_600SemiBold",
                fontSize: 12,
                fontWeight: activeFilter === tab.key ? "700" : "600",
                color: activeFilter === tab.key
                  ? (isDark ? "#12100A" : "#fff")
                  : (isDark ? "#948CA8" : "#8A829E"),
              }}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tournament cards */}
        {tournaments.map((t) => {
          const badge = getStatusBadge(t.status, isDark);
          return (
            <View key={t.id} style={{
              backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 20, overflow: "hidden", marginBottom: 14,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.12)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
            }}>
              <LinearGradient
                colors={t.gradientColors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ height: 100, justifyContent: "flex-end", padding: 14, paddingHorizontal: 16, position: "relative" }}
              >
                <View style={{
                  position: "absolute", top: 12, right: 12,
                  flexDirection: "row", alignItems: "center", gap: 5,
                  backgroundColor: badge.bg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
                }}>
                  {badge.dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: badge.dot }} />}
                  <Text style={{ color: badge.color, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.04 * 10 }}>{badge.label}</Text>
                </View>
                <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17, fontWeight: "700", letterSpacing: -0.01 * 17 }}>{t.name}</Text>
              </LinearGradient>

              <View style={{ padding: 14, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="calendar" size={14} color={metaIcon} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{t.date}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="location" size={14} color={metaIcon} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{t.location}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {t.teamAvatars && (
                      <View style={{ flexDirection: "row" }}>
                        {t.teamAvatars.map((a, i) => (
                          <View key={i} style={{
                            width: 26, height: 26, borderRadius: 13,
                            backgroundColor: a.bg, borderWidth: 2, borderColor: cardBg,
                            alignItems: "center", justifyContent: "center",
                            marginLeft: i > 0 ? -8 : 0,
                          }}>
                            <Text style={{ color: a.color, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>{a.initials}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>
                      {t.enrolledCount > 0 ? `${t.enrolledCount} ${t.status === "in_progress" ? "times" : "inscritos"}` : "0 inscritos"}
                    </Text>
                  </View>
                  <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>{t.actionLabel}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
