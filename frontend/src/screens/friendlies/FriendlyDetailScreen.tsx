import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
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

interface TeamInfo {
  name: string;
  initials: string;
  members: { name: string; initials: string; isCaptain: boolean }[];
}

const STATUS_CONFIG = {
  PENDING: { label: "PENDENTE", darkColor: "#FBBF24", darkBg: "rgba(251,191,36,.12)", lightColor: "#D97706", lightBg: "rgba(217,119,6,.08)" },
  ACCEPTED: { label: "ACEITO", darkColor: "#C6F82A", darkBg: "rgba(198,248,42,.1)", lightColor: "#059669", lightBg: "rgba(5,150,105,.08)" },
  REJECTED: { label: "RECUSADO", darkColor: "#EF4444", darkBg: "rgba(239,68,68,.1)", lightColor: "#EF4444", lightBg: "rgba(239,68,68,.08)" },
  CANCELLED: { label: "CANCELADO", darkColor: "#6E6684", darkBg: "rgba(110,102,132,.1)", lightColor: "#8A829E", lightBg: "rgba(138,130,158,.05)" },
  COMPLETED: { label: "CONCLUÍDO", darkColor: "#C6F82A", darkBg: "rgba(198,248,42,.1)", lightColor: "#059669", lightBg: "rgba(5,150,105,.08)" },
};

export function FriendlyDetailScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const avatarBg = isDark ? "#221B33" : "#F0ECFA";
  const avatarText = isDark ? "#CFC8E0" : "#7C3AED";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const id = route?.params?.id;
  const user = useAuthStore(s => s.user);
  const { data: friendly, loading, error, refetch } = useApi(() => friendliesService.findOne(id), [id]);

  const status = friendly?.status ?? "PENDING";
  const direction = friendly?.requesterId === user?.id ? "sent" as const : "received" as const;
  const statusConf = STATUS_CONFIG[status];

  const dateFormatted = friendly?.date
    ? new Date(friendly.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const timeFormatted = friendly?.startTime ?? "";
  const addressFormatted = friendly?.address ?? "";
  const cityFormatted = friendly?.city && friendly?.state ? `${friendly.city}, ${friendly.state}` : "";
  const modalityFormatted = friendly?.modality ?? "";
  const formatFormatted = friendly?.categoryFormat ?? "";
  const refereeCode = friendly?.refereeCode ?? "";

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const requesterTeam: TeamInfo = {
    name: friendly?.requesterTeam?.name ?? "",
    initials: getInitials(friendly?.requesterTeam?.name ?? "??"),
    members: (friendly?.athletes ?? [])
      .filter(a => a.side === "REQUESTER")
      .map(a => ({
        name: a.teamMember?.user?.name ?? "",
        initials: getInitials(a.teamMember?.user?.name ?? "??"),
        isCaptain: a.isCaptain,
      })),
  };

  const challengedTeam: TeamInfo = {
    name: friendly?.challengedTeam?.name ?? "",
    initials: getInitials(friendly?.challengedTeam?.name ?? "??"),
    members: (friendly?.athletes ?? [])
      .filter(a => a.side === "CHALLENGED")
      .map(a => ({
        name: a.teamMember?.user?.name ?? "",
        initials: getInitials(a.teamMember?.user?.name ?? "??"),
        isCaptain: a.isCaptain,
      })),
  };

  const handleCancel = () => {
    Alert.alert("Cancelar amistoso", "Tem certeza?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, cancelar", style: "destructive", onPress: async () => {
        try { await friendliesService.cancel(id); navigation?.goBack(); } catch {}
      }},
    ]);
  };

  const handleGenerateCode = async () => {
    try {
      const result = await friendliesService.generateRefereeCode(id);
      Alert.alert("Código de árbitro", `Código: ${result.refereeCode}`);
      refetch();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message || "Erro ao gerar código");
    }
  };

  const handleAccept = async () => {
    try { await friendliesService.accept(id, []); refetch(); } catch {}
  };

  const handleReject = async () => {
    try { await friendliesService.reject(id); navigation?.goBack(); } catch {}
  };

  if (loading && !friendly) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !friendly) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const renderTeamCard = (team: TeamInfo, label: string) => (
    <View style={{
      backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
      borderRadius: 18, padding: 16, marginBottom: 12,
      ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
    }}>
      <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 10, fontWeight: "600", letterSpacing: 0.1 * 10, marginBottom: 10 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <LinearGradient
          colors={["#8B5CF6", "#6D3BEA"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17, fontWeight: "700" }}>{team.initials}</Text>
        </LinearGradient>
        <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17, fontWeight: "700" }}>{team.name}</Text>
      </View>
      <View style={{ gap: 8 }}>
        {team.members.map((m) => (
          <View key={m.initials} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{
              width: 30, height: 30, borderRadius: 10,
              backgroundColor: m.isCaptain ? undefined : avatarBg,
              alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {m.isCaptain ? (
                <LinearGradient
                  colors={["#8B5CF6", "#6D3BEA"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{m.initials}</Text>
                </LinearGradient>
              ) : (
                <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{m.initials}</Text>
              )}
            </View>
            <Text style={{ flex: 1, color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>{m.name}</Text>
            {m.isCaptain && (
              <View style={{
                paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6,
                backgroundColor: isDark ? "rgba(198,248,42,.12)" : "rgba(124,58,237,.08)",
              }}>
                <Text style={{
                  color: isDark ? "#C6F82A" : "#7C3AED",
                  fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700",
                }}>CAPITÃO</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        style={{ paddingHorizontal: 22, paddingTop: 14 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}
      >
        {/* Header */}
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
          <View style={{
            paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8,
            backgroundColor: isDark ? statusConf.darkBg : statusConf.lightBg,
          }}>
            <Text style={{
              color: isDark ? statusConf.darkColor : statusConf.lightColor,
              fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.06 * 10,
            }}>{statusConf.label}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", marginBottom: 4 }}>
            {requesterTeam.name}
          </Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>
            vs
          </Text>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", marginTop: 4 }}>
            {challengedTeam.name}
          </Text>
        </View>

        {/* Info cards */}
        <View style={{
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 18, padding: 16, marginBottom: 16,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          {[
            { icon: "calendar" as const, label: "Data", value: dateFormatted },
            { icon: "clock" as const, label: "Horário", value: timeFormatted },
            { icon: "location" as const, label: "Local", value: `${addressFormatted}${cityFormatted ? `\n${cityFormatted}` : ""}` },
            { icon: "volleyball" as const, label: "Modalidade", value: `${modalityFormatted}${formatFormatted ? ` · ${formatFormatted}` : ""}` },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 11,
                  backgroundColor: infoBg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={item.icon} size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{item.label}</Text>
                  <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600", marginTop: 1 }}>{item.value}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: dividerColor }} />}
            </View>
          ))}
        </View>

        {/* Teams */}
        {renderTeamCard(requesterTeam, "TIME SOLICITANTE")}
        {renderTeamCard(challengedTeam, "TIME DESAFIADO")}

        {/* Referee code (only for accepted) */}
        {status === "ACCEPTED" && refereeCode ? (
          <View style={{
            backgroundColor: isDark ? "rgba(139,92,246,.08)" : "rgba(124,58,237,.06)",
            borderWidth: 1, borderColor: isDark ? "rgba(139,92,246,.2)" : "rgba(124,58,237,.15)",
            borderRadius: 18, padding: 18, marginBottom: 16, alignItems: "center",
          }}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 10, fontWeight: "600", letterSpacing: 0.1 * 10, marginBottom: 8 }}>
              CÓDIGO DO ÁRBITRO
            </Text>
            <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 32, fontWeight: "700", letterSpacing: 6 }}>
              {refereeCode}
            </Text>
            <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 6 }}>
              Compartilhe com o árbitro para iniciar a partida
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        {status === "ACCEPTED" && (
          <View style={{ gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={handleGenerateCode}
              accessibilityRole="button"
              accessibilityLabel="Gerar código de árbitro"
              style={{
                width: "100%", paddingVertical: 15, borderRadius: 16,
                backgroundColor: accentColor,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 6 }),
              }}
            >
              <Icon name="shield" size={16} color={isDark ? "#12100A" : "#fff"} strokeWidth={2} />
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
                Gerar código de árbitro
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancelar amistoso"
              style={{
                width: "100%", paddingVertical: 15, borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? "rgba(239,68,68,.3)" : "rgba(239,68,68,.2)",
                backgroundColor: isDark ? "rgba(239,68,68,.08)" : "rgba(239,68,68,.05)",
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Icon name="close" size={16} color="#EF4444" strokeWidth={2} />
              <Text style={{ color: "#EF4444", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
                Cancelar amistoso
              </Text>
            </Pressable>
          </View>
        )}

        {status === "PENDING" && direction === "received" && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={handleAccept}
              accessibilityRole="button"
              accessibilityLabel="Aceitar amistoso"
              style={{
                flex: 1, paddingVertical: 15, borderRadius: 16,
                backgroundColor: accentColor,
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 6 }),
              }}
            >
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Aceitar</Text>
            </Pressable>
            <Pressable
              onPress={handleReject}
              accessibilityRole="button"
              accessibilityLabel="Recusar amistoso"
              style={{
                flex: 1, paddingVertical: 15, borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
                backgroundColor: "transparent",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ color: metaColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Recusar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
