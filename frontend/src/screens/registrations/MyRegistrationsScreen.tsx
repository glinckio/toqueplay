import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { RegistrationDTO, registrationsService } from "@/services/registrationsService";
import { RegistrationStatus } from "@/types/enums";

type StatusStyle = {
  label: string;
  pillText: string;
  pillBg: string;
  cardBorder: string;
  opacity: number;
};

function statusStyle(status: RegistrationStatus, isDark: boolean): StatusStyle {
  switch (status) {
    case RegistrationStatus.CONFIRMED:
      return {
        label: "PAGO",
        pillText: isDark ? "#C6F82A" : "#059669",
        pillBg: isDark ? "rgba(198,248,42,.1)" : "rgba(5,150,105,.08)",
        cardBorder: isDark ? "rgba(198,248,42,.1)" : "rgba(124,58,237,.1)",
        opacity: 1,
      };
    case RegistrationStatus.PENDING_CONFIRMATION:
      return {
        label: "PENDENTE",
        pillText: isDark ? "#FBBF24" : "#D97706",
        pillBg: isDark ? "rgba(251,191,36,.12)" : "rgba(217,119,6,.08)",
        cardBorder: isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)",
        opacity: 1,
      };
    case RegistrationStatus.REJECTED:
      return {
        label: "RECUSADA",
        pillText: "#EF4444",
        pillBg: isDark ? "rgba(239,68,68,.1)" : "rgba(239,68,68,.08)",
        cardBorder: isDark ? "rgba(239,68,68,.08)" : "rgba(239,68,68,.06)",
        opacity: isDark ? 0.6 : 0.55,
      };
    case RegistrationStatus.CANCELLED:
    default:
      return {
        label: "CANCELADA",
        pillText: isDark ? "#6E6684" : "#8A829E",
        pillBg: isDark ? "rgba(110,102,132,.1)" : "rgba(26,16,48,.05)",
        cardBorder: isDark ? "rgba(255,255,255,.04)" : "rgba(26,16,48,.04)",
        opacity: 0.45,
      };
  }
}

function formatType(type: string): string {
  if (type === "MALE") return "Masculina";
  if (type === "FEMALE") return "Feminina";
  return "Mista";
}

function formatFormat(format: string): string {
  if (format === "PAIR") return "Dupla";
  if (format === "QUARTET") return "Quarteto";
  return "Sexteto";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function MyRegistrationsScreen({ navigation }: any) {
  const { isDark, colors } = useTheme();
  const [registrations, setRegistrations] = useState<RegistrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardShadow = isDark
    ? {}
    : { shadowColor: "rgba(46,16,101,.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 };
  const metaColor = isDark ? "#6E6684" : "#8A829E";
  const teamNameColor = isDark ? "#948CA8" : "#6B6480";
  const titleColor = isDark ? "#F5F3FA" : "#1A1030";
  const avatarDark = ["#2D1B69", "#1C4A3D", "#4A1942", "#3D2A1A", "#3D1A1A"];
  const avatarDarkText = ["#C6F82A", "#34D399", "#F472B6", "#FBBF24", "#FCA5A5"];
  const avatarLight = ["#E8DEFF", "#D1FAE5", "#FCE7F3"];
  const avatarLightText = ["#7C3AED", "#059669", "#DB2777"];

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await registrationsService.listMine();
      setRegistrations(data);
    } catch {
      // API not available yet — keep current state (mock shown in tests)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goBack = () => navigation?.goBack();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F6F4FC" }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingHorizontal: 22, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={isDark ? "#C6F82A" : "#7C3AED"}
          />
        }
      >
        {/* Header with back */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700", letterSpacing: -0.02 * 20 }}>
            Minhas inscrições
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={isDark ? "#C6F82A" : "#7C3AED"} />
          </View>
        ) : registrations.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          registrations.map((reg) => {
            const st = statusStyle(reg.status, isDark);
            const teamInitials = reg.team.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const colorIdx = reg.teamId.charCodeAt(0) % 5;
            const avatarBg = isDark ? avatarDark[Math.min(colorIdx, 4)] : avatarLight[Math.min(colorIdx, 2)];
            const avatarText = isDark ? avatarDarkText[Math.min(colorIdx, 4)] : avatarLightText[Math.min(colorIdx, 2)];
            return (
              <View
                key={reg.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: st.cardBorder,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                  opacity: st.opacity,
                  ...cardShadow,
                }}
              >
                {/* Status row */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: st.pillBg }}>
                    <Text style={{ color: st.pillText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>
                      {st.label}
                    </Text>
                  </View>
                  <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                    {formatDate(reg.createdAt)}
                  </Text>
                </View>

                {/* Tournament name */}
                <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
                  {reg.tournament.name}
                </Text>

                {/* Team row */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: avatarBg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{teamInitials}</Text>
                  </View>
                  <Text style={{ color: teamNameColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{reg.team.name}</Text>
                </View>

                {/* Meta row: category + modality */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: reg.status === RegistrationStatus.PENDING_CONFIRMATION ? 14 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="trophy" size={12} color={metaColor} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                      {formatFormat(reg.category.format)} {formatType(reg.category.type)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="location" size={12} color={metaColor} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                      {reg.category.modality === "BEACH" ? "Areia" : "Quadra"}
                    </Text>
                  </View>
                </View>

                {/* Pending notice */}
                {reg.status === RegistrationStatus.PENDING_CONFIRMATION && (
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    backgroundColor: isDark ? "rgba(251,191,36,.06)" : "rgba(217,119,6,.05)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(251,191,36,.15)" : "rgba(217,119,6,.12)",
                    borderRadius: 12, padding: 10, paddingHorizontal: 14,
                  }}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#FBBF24" : "#D97706"} strokeWidth={2}>
                      <Circle cx={12} cy={12} r={9} />
                      <Path d="M12 8v4M12 16h.01" />
                    </Svg>
                    <Text style={{ color: isDark ? "#FBBF24" : "#D97706", fontFamily: "Manrope_500Medium", fontSize: 11.5, fontWeight: "500", lineHeight: 16, flex: 1 }}>
                      Pagamento pendente de confirmação pelo organizador.
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? "#171221" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.06)",
      borderRadius: 18, padding: 13, alignItems: "center",
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? "#241B38" : "#F0ECFA", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name="trophy" size={22} color={isDark ? "#C6F82A" : "#7C3AED"} />
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>Nenhuma inscrição ainda</Text>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12.5, fontWeight: "500", lineHeight: 19, textAlign: "center", maxWidth: 250 }}>
        Inscreva seu time em um torneio para vê-lo aqui.
      </Text>
    </View>
  );
}
