import React, { useCallback, useState, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StatusBar, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { RegistrationDTO, registrationsService } from "@/services/registrationsService";
import { RegistrationStatus } from "@/types/enums";
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
    danger: "#FF4D5E",
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

type StatusStyle = {
  label: string;
  pillText: string;
  pillBg: string;
  cardBorder: string;
  opacity: number;
};

function statusStyle(status: RegistrationStatus, C: ScreenColors): StatusStyle {
  switch (status) {
    case RegistrationStatus.CONFIRMED:
      return { label: "PAGO", pillText: C.isDark ? C.lime : C.purple, pillBg: C.limeTintBg, cardBorder: "rgba(198,248,42,0.14)", opacity: 1 };
    case RegistrationStatus.PENDING_CONFIRMATION:
      return { label: "PENDENTE", pillText: "#FBBF24", pillBg: "rgba(251,191,36,0.14)", cardBorder: C.cardBorder, opacity: 1 };
    case RegistrationStatus.REJECTED:
      return { label: "RECUSADA", pillText: C.danger, pillBg: "rgba(255,77,94,0.12)", cardBorder: "rgba(255,77,94,0.1)", opacity: 0.6 };
    case RegistrationStatus.CANCELLED:
    default:
      return { label: "CANCELADA", pillText: C.tx3, pillBg: "rgba(255,255,255,0.08)", cardBorder: "rgba(255,255,255,0.04)", opacity: 0.45 };
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

const AVATAR_BG = ["#2D1B69", "#1C4A3D", "#4A1942", "#3D2A1A", "#3D1A1A"];
const AVATAR_TEXT = ["#C6F82A", "#34D399", "#F472B6", "#FBBF24", "#FCA5A5"];

const RegistrationRow = React.memo(function RegistrationRow({ reg }: { reg: RegistrationDTO }) {
  const C = useScreenColors();
  const st = statusStyle(reg.status, C);
  const teamInitials = reg.team.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colorIdx = reg.teamId.charCodeAt(0) % 5;
  const avatarBg = AVATAR_BG[colorIdx];
  const avatarText = AVATAR_TEXT[colorIdx];
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: st.cardBorder,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        opacity: st.opacity,
      }}
    >
      {/* Status row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: st.pillBg }}>
          <Text style={{ color: st.pillText, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 0.6 }}>
            {st.label}
          </Text>
        </View>
        <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11 }}>
          {formatDate(reg.createdAt)}
        </Text>
      </View>

      {/* Tournament name */}
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.2, textTransform: "uppercase", marginBottom: 8 }}>
        {reg.tournament.name}
      </Text>

      {/* Team row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: (reg.status === RegistrationStatus.CONFIRMED || reg.status === RegistrationStatus.PENDING_CONFIRMATION) ? 10 : 0 }}>
        {reg.team.avatarUrl ? (
          <Image source={{ uri: reg.team.avatarUrl }} style={{ width: 28, height: 28, borderRadius: 9 }} />
        ) : (
          <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: avatarBg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: avatarText, fontFamily: "Oswald_700Bold", fontSize: 10 }}>{teamInitials}</Text>
          </View>
        )}
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{reg.team.name}</Text>
      </View>

      {/* Meta row: category + modality — only for CONFIRMED and PENDING */}
      {(reg.status === RegistrationStatus.CONFIRMED || reg.status === RegistrationStatus.PENDING_CONFIRMATION) && (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: reg.status === RegistrationStatus.PENDING_CONFIRMATION ? 14 : 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth={2}>
            <Circle cx={12} cy={12} r={3} />
            <Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M2 12h3M19 12h3" />
          </Svg>
          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11 }}>
            {formatFormat(reg.category.format)} {formatType(reg.category.type)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth={2}>
            <Path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" />
            <Circle cx={12} cy={9} r={2.5} />
          </Svg>
          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11 }}>
            {reg.category.modality === "BEACH" ? "Areia" : "Quadra"}
          </Text>
        </View>
      </View>
      )}

      {/* Pending notice */}
      {reg.status === RegistrationStatus.PENDING_CONFIRMATION && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: "rgba(251,191,36,0.08)",
          borderWidth: 1, borderColor: "rgba(251,191,36,0.2)",
          borderRadius: 12, padding: 10, paddingHorizontal: 14,
        }}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth={2}>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M12 8v4M12 16h.01" />
          </Svg>
          <Text style={{ color: "#FBBF24", fontFamily: "Manrope_500Medium", fontSize: 11.5, lineHeight: 16, flex: 1 }}>
            Pagamento pendente de confirmação pelo organizador.
          </Text>
        </View>
      )}
    </View>
  );
});

export function MyRegistrationsScreen({ navigation }: any) {
  const C = useScreenColors();
  const [registrations, setRegistrations] = useState<RegistrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
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
  }, []);

  // useFocusEffect already fires on initial mount + every focus after —
  // an extra plain useEffect(load, []) here would just double-fetch on open.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goBack = () => navigation?.goBack();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingHorizontal: 22, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.lime} />}
        data={registrations}
        keyExtractor={(reg) => reg.id}
        renderItem={({ item }) => <RegistrationRow reg={item} />}
        ListEmptyComponent={loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.lime} />
          </View>
        ) : (
          <EmptyState />
        )}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="back" size={19} color={C.tx2} strokeWidth={2.2} />
            </Pressable>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>
              Minhas inscrições
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  const C = useScreenColors();
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 24, alignItems: "center" }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, borderWidth: 2, borderColor: "rgba(198,248,42,0.5)", transform: [{ rotate: "-4deg" }], backgroundColor: C.purpleDeep, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon name="trophy" size={24} color={C.lime} />
      </View>
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6 }}>Nenhuma inscrição ainda</Text>
      <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19, textAlign: "center", maxWidth: 250 }}>
        Inscreva seu time em um torneio para vê-lo aqui.
      </Text>
    </View>
  );
}
