import React, { useState } from "react";
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
import Svg, { Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { friendliesService } from "@/services/friendliesService";
import { useAuthStore } from "@/stores/authStore";

type TabOption = "Enviados" | "Recebidos";

interface FriendlyCard {
  id: string;
  opponentName: string;
  opponentInitials: string;
  myTeamName: string;
  date: string;
  time: string;
  location: string;
  modality: string;
  format: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  direction: "sent" | "received";
}

const STATUS_CONFIG = {
  PENDING: { label: "PENDENTE", darkColor: "#FBBF24", darkBg: "rgba(251,191,36,.12)", lightColor: "#D97706", lightBg: "rgba(217,119,6,.08)" },
  ACCEPTED: { label: "ACEITO", darkColor: "#C6F82A", darkBg: "rgba(198,248,42,.1)", lightColor: "#059669", lightBg: "rgba(5,150,105,.08)" },
  REJECTED: { label: "RECUSADO", darkColor: "#EF4444", darkBg: "rgba(239,68,68,.1)", lightColor: "#EF4444", lightBg: "rgba(239,68,68,.08)" },
  CANCELLED: { label: "CANCELADO", darkColor: "#6E6684", darkBg: "rgba(110,102,132,.1)", lightColor: "#8A829E", lightBg: "rgba(138,130,158,.05)" },
  COMPLETED: { label: "CONCLUÍDO", darkColor: "#C6F82A", darkBg: "rgba(198,248,42,.1)", lightColor: "#059669", lightBg: "rgba(5,150,105,.08)" },
};

export function MyFriendliesScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const tabContainerBg = isDark ? "#141019" : "#FFFFFF";
  const tabContainerBorder = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const avatarBg = isDark ? "#221B33" : "#F0ECFA";
  const avatarText = isDark ? "#CFC8E0" : "#7C3AED";

  const [activeTab, setActiveTab] = useState<TabOption>("Enviados");

  const user = useAuthStore(s => s.user);
  const { data: friendlies, loading, error, refetch } = useApi(() => friendliesService.findMine(), []);

  const mapped: FriendlyCard[] = (friendlies ?? []).map(f => {
    const isSender = f.requesterId === user?.id;
    const opponentTeam = isSender ? f.challengedTeam : f.requesterTeam;
    const myTeam = isSender ? f.requesterTeam : f.challengedTeam;
    return {
      id: f.id,
      opponentName: opponentTeam?.name ?? "Adversário",
      opponentInitials: (opponentTeam?.name ?? "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      myTeamName: myTeam?.name ?? "",
      date: f.date ? new Date(f.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "",
      time: f.startTime ?? "",
      location: f.city ?? f.address ?? "",
      modality: f.modality ?? "",
      format: f.categoryFormat ?? "",
      status: f.status,
      direction: isSender ? "sent" as const : "received" as const,
    };
  });

  const filtered = mapped.filter((f) =>
    activeTab === "Enviados" ? f.direction === "sent" : f.direction === "received"
  );

  if (loading && !friendlies) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !friendlies) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22 }}>
              Amistosos
            </Text>
          </View>
          <Pressable
            onPress={() => navigation?.navigate("CreateFriendly")}
            accessibilityRole="button"
            accessibilityLabel="Criar amistoso"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: accentColor,
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 4 }),
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </Pressable>
        </View>

        {/* Segmented tabs */}
        <View style={{
          flexDirection: "row",
          backgroundColor: tabContainerBg,
          borderWidth: 1, borderColor: tabContainerBorder,
          borderRadius: 14, padding: 4, marginBottom: 16,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.12)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
        }}>
          {(["Enviados", "Recebidos"] as TabOption[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="button"
                accessibilityLabel={tab}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 11,
                  backgroundColor: isActive ? accentColor : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{
                  color: isActive ? (isDark ? "#12100A" : "#fff") : (isDark ? "#948CA8" : "#8A829E"),
                  fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700",
                }}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ paddingHorizontal: 22 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: isDark ? "#171320" : "#F0ECFA",
              alignItems: "center", justifyContent: "center", marginBottom: 14,
            }}>
              <Icon name="volleyball" size={28} color={labelColor} strokeWidth={1.8} />
            </View>
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
              Nenhum amistoso
            </Text>
            <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", textAlign: "center" }}>
              {activeTab === "Enviados" ? "Você ainda não enviou convites" : "Nenhum convite recebido"}
            </Text>
          </View>
        ) : (
          filtered.map((friendly) => {
            const statusConf = STATUS_CONFIG[friendly.status];
            return (
              <Pressable
                key={friendly.id}
                onPress={() => navigation?.navigate("FriendlyDetail", { id: friendly.id })}
                accessibilityRole="button"
                accessibilityLabel={`Amistoso contra ${friendly.opponentName}`}
                style={{
                  backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                  borderRadius: 20, padding: 18, marginBottom: 14,
                  ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 2 }),
                }}
              >
                {/* Top row: opponent + status */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: avatarBg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
                      {friendly.opponentInitials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
                      vs {friendly.opponentName}
                    </Text>
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>
                      {friendly.myTeamName} · {friendly.format}
                    </Text>
                  </View>
                  <View style={{
                    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                    backgroundColor: isDark ? statusConf.darkBg : statusConf.lightBg,
                  }}>
                    <Text style={{
                      color: isDark ? statusConf.darkColor : statusConf.lightColor,
                      fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700", letterSpacing: 0.06 * 9,
                    }}>{statusConf.label}</Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="calendar" size={13} color={labelColor} strokeWidth={2} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                      {friendly.date}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="clock" size={13} color={labelColor} strokeWidth={2} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                      {friendly.time}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="location" size={13} color={labelColor} strokeWidth={2} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }} numberOfLines={1}>
                      {friendly.location}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
