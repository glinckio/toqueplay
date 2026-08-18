import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";

type RegistrationStatus = "pending" | "paid" | "rejected";

interface StatItem {
  value: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface RegistrationItem {
  initials: string;
  teamName: string;
  detail: string;
  status: RegistrationStatus;
  avatarBg: string;
  avatarColor: string;
  confirmedAt?: string;
}

function getStats(isDark: boolean): StatItem[] {
  return [
    { value: 12, label: "Total", color: isDark ? "#F5F3FA" : "#1A1030", bg: isDark ? "#141019" : "#fff", border: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)" },
    { value: 7, label: "Pagos", color: isDark ? "#C6F82A" : "#7C3AED", bg: isDark ? "rgba(198,248,42,0.06)" : "rgba(124,58,237,0.05)", border: isDark ? "rgba(198,248,42,0.12)" : "rgba(124,58,237,0.1)" },
    { value: 4, label: "Pendentes", color: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251,191,36,0.06)" : "rgba(217,119,6,0.05)", border: isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.1)" },
    { value: 1, label: "Recusada", color: "#EF4444", bg: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.05)", border: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.1)" },
  ];
}

function getRegistrations(isDark: boolean): RegistrationItem[] {
  return [
    { initials: "BT", teamName: "Beach Titans", detail: "2 atletas · Marcos Silva", status: "pending", avatarBg: isDark ? "#2D1B69" : "#E8DEFF", avatarColor: isDark ? "#C6F82A" : "#7C3AED" },
    { initials: "PA", teamName: "Praia Aces", detail: "2 atletas · João Ferreira", status: "paid", avatarBg: isDark ? "#1C4A3D" : "#D1FAE5", avatarColor: isDark ? "#34D399" : "#059669", confirmedAt: "Confirmado em 12/08/2026 às 14:30" },
    { initials: "SR", teamName: "Sand Rockets", detail: "2 atletas · Ana Costa", status: "pending", avatarBg: isDark ? "#4A1942" : "#FCE7F3", avatarColor: isDark ? "#F472B6" : "#DB2777" },
    { initials: "VF", teamName: "Volley Flames", detail: "2 atletas · Pedro Lima", status: "rejected", avatarBg: isDark ? "#3D1A1A" : "#FEE2E2", avatarColor: isDark ? "#FCA5A5" : "#EF4444" },
  ];
}

function getStatusBadge(status: RegistrationStatus, isDark: boolean) {
  switch (status) {
    case "pending":
      return { label: "PENDENTE", bg: isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)", color: isDark ? "#FBBF24" : "#D97706" };
    case "paid":
      return { label: "PAGO", bg: isDark ? "rgba(198,248,42,0.1)" : "rgba(5,150,105,0.08)", color: isDark ? "#C6F82A" : "#059669" };
    case "rejected":
      return { label: "RECUSADA", bg: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)", color: "#EF4444" };
  }
}

function getCardBorder(status: RegistrationStatus, isDark: boolean) {
  switch (status) {
    case "paid": return isDark ? "rgba(198,248,42,0.1)" : "rgba(124,58,237,0.1)";
    case "rejected": return isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)";
    default: return isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)";
  }
}

export function ManageRegistrationsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const bgBase = isDark ? "#0C0A12" : "#F6F4FC";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const stats = getStats(isDark);
  const registrations = getRegistrations(isDark);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
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
          <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700", letterSpacing: -0.02 * 20 }}>Inscrições</Text>
        </View>
        <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginBottom: 18, paddingLeft: 52 }}>Copa Verão Beach 2026 · Dupla Masculina</Text>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
          {stats.map((s) => (
            <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center",
              ...(isDark || s.label !== "Total" ? {} : { shadowColor: "rgba(46,16,101,0.1)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }),
            }}>
              <Text style={{ color: s.color, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>{s.value}</Text>
              <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Registration cards */}
        {registrations.map((r) => {
          const badge = getStatusBadge(r.status, isDark);
          const border = getCardBorder(r.status, isDark);
          return (
            <View key={r.initials} style={{
              backgroundColor: cardBg, borderWidth: 1, borderColor: border,
              borderRadius: 18, padding: 16, marginBottom: 12,
              opacity: r.status === "rejected" ? (isDark ? 0.6 : 0.55) : 1,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: r.status === "rejected" ? 0 : 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: r.avatarBg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: r.avatarColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>{r.initials}</Text>
                  </View>
                  <View>
                    <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>{r.teamName}</Text>
                    <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>{r.detail}</Text>
                  </View>
                </View>
                <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: badge.bg }}>
                  <Text style={{ color: badge.color, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{badge.label}</Text>
                </View>
              </View>

              {r.status === "pending" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                    backgroundColor: accentColor, borderRadius: 12, paddingVertical: 11,
                    ...(isDark ? {} : { shadowColor: "rgba(124,58,237,0.5)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 }),
                  }}>
                    <Icon name="check" size={14} color={isDark ? "#12100A" : "#fff"} strokeWidth={2.5} />
                    <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>Confirmar pgto</Text>
                  </Pressable>
                  <Pressable style={{
                    width: 44, borderWidth: 1,
                    borderColor: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
                    backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
                    borderRadius: 12, alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="close" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              )}

              {r.status === "paid" && r.confirmedAt && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="calendar" size={13} color={isDark ? "#6E6684" : "#A29CB4"} />
                  <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{r.confirmedAt}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
