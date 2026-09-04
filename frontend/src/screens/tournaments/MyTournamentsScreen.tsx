import React, { useCallback, useState, useMemo } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { tournamentsService, TournamentDTO } from "@/services/tournamentsService";
import { formatDate } from "@/utils/dateFormat";
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
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

type ScreenColors = ReturnType<typeof useScreenColors>;

type FilterTab = "all" | "draft" | "active" | "finished";

interface TournamentItem {
  id: string;
  name: string;
  date: string;
  location: string;
  status: "open" | "draft" | "in_progress" | "finished";
  enrolledCount: number;
  actionLabel: string;
  gradientColors: [string, string];
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "draft", label: "Rascunho" },
  { key: "active", label: "Ativo" },
  { key: "finished", label: "Encerrado" },
];

function getStatusBadge(status: TournamentItem["status"], C: ScreenColors) {
  switch (status) {
    case "open":
      return { label: "INSCRIÇÕES ABERTAS", bg: C.limeTintBg, color: C.isDark ? C.lime : C.purple, dot: C.isDark ? C.lime : C.purple };
    case "draft":
      return { label: "RASCUNHO", bg: "rgba(255,255,255,0.1)", color: C.tx2 };
    case "in_progress":
      return { label: "EM ANDAMENTO", bg: "rgba(52,211,153,0.16)", color: "#34D399", dot: "#34D399" };
    case "finished":
      return { label: "ENCERRADO", bg: "rgba(255,255,255,0.08)", color: C.tx3 };
  }
}

function mapTournaments(data: TournamentDTO[], C: ScreenColors): TournamentItem[] {
  return data.map((t) => {
    const statusMap: Record<string, TournamentItem["status"]> = {
      DRAFT: "draft",
      PUBLISHED: "draft",
      REGISTRATION_OPEN: "open",
      REGISTRATION_CLOSED: "open",
      BRACKET_GENERATED: "in_progress",
      IN_PROGRESS: "in_progress",
      FINISHED: "finished",
      CANCELLED: "finished",
    };
    const status = statusMap[t.status] ?? "draft";
    const actionMap: Record<TournamentItem["status"], string> = {
      open: "Gerenciar →",
      draft: "Editar →",
      in_progress: "Ver partidas →",
      finished: "Ver resultado →",
    };
    const stage = (t as any).stages?.[0];
    const dateSource = stage?.date ?? t.date;
    const citySource = stage?.city ?? t.city;
    const stateSource = stage?.state ?? t.state;
    return {
      id: t.id,
      name: t.name,
      date: dateSource ? formatDate(dateSource, { day: "numeric", month: "short", year: "numeric" }) : "Sem data definida",
      location: [citySource, stateSource].filter(Boolean).join(", ") || "",
      status,
      enrolledCount: t._count?.registrations ?? 0,
      actionLabel: actionMap[status],
      gradientColors: [C.purpleDeep, "#140E28"],
    };
  });
}

export function MyTournamentsScreen({ navigation }: any) {
  const C = useScreenColors();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const { data: rawTournaments, loading, error, refetch } = useApi(() => tournamentsService.findMine(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));
  const tournaments = mapTournaments(rawTournaments ?? [], C).filter(
    (t) => activeFilter === "all" || t.status === activeFilter
  );

  if (loading && !rawTournaments) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={C.lime} />
      </SafeAreaView>
    );
  }

  if (error && !rawTournaments) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={() => refetch()} accessibilityRole="button">
          <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => navigation?.goBack()}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="back" size={19} color={C.tx2} />
            </Pressable>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>Meus torneios</Text>
          </View>
          <Pressable
            onPress={() => navigation?.navigate("CreateTournament")}
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="plus" size={20} color={C.onAccent} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
                  backgroundColor: isActive ? C.purple : C.card,
                  borderWidth: isActive ? 0 : 1, borderColor: C.cardBorder,
                }}
              >
                <Text style={{
                  fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase",
                  color: isActive ? C.onAccent : C.tx2,
                }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tournament cards */}
        {tournaments.map((t) => {
          const badge = getStatusBadge(t.status, C);
          return (
            <Pressable key={t.id} onPress={() => navigation?.navigate("TournamentDetail", { id: t.id })} style={{
              backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
              borderRadius: 20, overflow: "hidden", marginBottom: 14,
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
                  <Text style={{ color: badge.color, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.6 }}>{badge.label}</Text>
                </View>
                <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 19, letterSpacing: 0.2, textTransform: "uppercase" }}>{t.name}</Text>
              </LinearGradient>

              <View style={{ padding: 14, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="calendar" size={14} color={C.tx3} />
                    <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{t.date}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="location" size={14} color={C.tx3} />
                    <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{t.location}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
                    {t.enrolledCount > 0 ? `${t.enrolledCount} ${t.status === "in_progress" ? "times" : "inscritos"}` : "0 inscritos"}
                  </Text>
                  <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>{t.actionLabel}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
