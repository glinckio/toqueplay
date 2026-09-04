import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle, Rect, Polygon } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { friendliesService } from "@/services/friendliesService";
import { teamsService } from "@/services/teamsService";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/services/api";
import { useTC, StatusPill } from "../tournaments/_tournamentKit";
import { formatDate, formatTime } from "@/utils/dateFormat";

const FORMAT_COUNT: Record<string, number> = { PAIR: 2, QUARTET: 4, SEXTET: 6 };

const STATUS_TONE: Record<string, "open" | "closed" | "progress" | "neutral"> = {
  PENDING: "neutral",
  ACCEPTED: "open",
  REJECTED: "closed",
  CANCELLED: "closed",
  COMPLETED: "open",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "PENDENTE", ACCEPTED: "ACEITO", REJECTED: "RECUSADO", CANCELLED: "CANCELADO", COMPLETED: "CONCLUÍDO",
};

const TEAM_COLORS = [
  { bg: "#1C4A3D", text: "#34D399" },
  { bg: "#2D1B69", text: "#C6F82A" },
  { bg: "#4A1942", text: "#F472B6" },
  { bg: "#3D2A1A", text: "#FBBF24" },
];
function getTeamColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

function Section({ label }: { label: string }) {
  const TC = useTC();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: TC.lime }} />
      <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

function TeamBlock({ name, initials, avatar, role }: { name: string; initials: string; avatar: string | null; role: string }) {
  const TC = useTC();
  const col = getTeamColor(name);
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: 60, height: 60, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.15)" }} />
      ) : (
        <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: col.bg, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: col.text, fontFamily: "Oswald_700Bold", fontSize: 19 }}>{initials}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 15, letterSpacing: 0.2, textTransform: "uppercase", marginTop: 10, textAlign: "center" }}>{name}</Text>
      <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Oswald_500Medium", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{role}</Text>
    </View>
  );
}

export function FriendlyDetailScreen({ navigation, route }: any) {
  const TC = useTC();
  const id = route?.params?.id;
  const user = useAuthStore(s => s.user);
  const { data: friendly, loading, error, refetch } = useApi(() => friendliesService.findOne(id), [id]);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  const status = friendly?.status ?? "PENDING";
  const direction = friendly?.requesterId === user?.id ? "sent" as const : "received" as const;

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const requesterName = friendly?.requesterTeam?.name ?? "Time A";
  const requesterInitials = getInitials(requesterName);
  const challengedName = friendly?.challengedTeam?.name ?? "Time B";
  const challengedInitials = getInitials(challengedName);

  const dateFormatted = friendly?.date ? formatDate(friendly.date, { day: "2-digit", month: "short", year: "numeric" }) : "";
  const timeFormatted = friendly?.startTime ? formatTime(friendly.startTime) : "";
  const dateTimeStr = `${dateFormatted}${timeFormatted ? ` às ${timeFormatted}` : ""}`;
  const addressParts = [friendly?.address, friendly?.addressNumber].filter(Boolean).join(", ");
  const addressFull = [addressParts, friendly?.complement, friendly?.neighborhood].filter(Boolean).join(" - ");
  const cityState = friendly?.city && friendly?.state ? `${friendly.city}/${friendly.state}` : friendly?.city ?? friendly?.state;
  const locationStr = [addressFull, cityState].filter(Boolean).join(" — ");
  const modalityStr = friendly?.modality === "BEACH" ? "Vôlei de Areia" : friendly?.modality === "INDOOR" ? "Quadra" : (friendly?.modality ?? "");
  const refereeCode = friendly?.refereeCode ?? "";

  const lat = (friendly as any)?.latitude;
  const lng = (friendly as any)?.longitude;
  const hasLocation = !!(addressParts || friendly?.city || (lat != null && lng != null));
  const openMaps = () => {
    const query = lat != null && lng != null ? `${lat},${lng}` : [addressParts, friendly?.city, friendly?.state].filter(Boolean).join(", ");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => Alert.alert("Erro", "Não foi possível abrir o mapa."));
  };

  const handleCancel = () => {
    Alert.alert("Cancelar amistoso", "Tem certeza?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, cancelar", style: "destructive", onPress: async () => { try { await friendliesService.cancel(id); navigation?.goBack(); } catch {} } },
    ]);
  };
  const handleGenerateCode = async () => {
    try {
      const result = await friendliesService.generateRefereeCode(id);
      Alert.alert("Código de árbitro", `Código: ${result.refereeCode}`);
      refetch();
    } catch (err: any) { Alert.alert("Erro", getErrorMessage(err, "Erro ao gerar código")); }
  };
  const challengedTeamId = friendly?.challengedTeam?.id;
  const categoryFormat = (friendly as any)?.categoryFormat as string | undefined;
  const expectedCount = categoryFormat ? FORMAT_COUNT[categoryFormat] : undefined;

  const [accepting, setAccepting] = useState(false);

  const doAccept = async (athleteIds: string[]) => {
    setAccepting(true);
    try {
      await friendliesService.accept(id, athleteIds);
      refetch();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível aceitar o amistoso."));
    } finally {
      setAccepting(false);
    }
  };

  // Friendlies don't ask for a lineup — auto-fill from the challenged team's roster.
  const handleAccept = async () => {
    if (!expectedCount || !challengedTeamId) { doAccept([]); return; }
    setAccepting(true);
    try {
      const list = await teamsService.listMembers(challengedTeamId);
      if (list.length < expectedCount) {
        Alert.alert("Time incompleto", `Seu time precisa de ${expectedCount} jogadores para aceitar este amistoso (tem ${list.length}).`);
        setAccepting(false);
        return;
      }
      await doAccept(list.slice(0, expectedCount).map((m) => m.id));
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível aceitar o amistoso."));
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    try { await friendliesService.reject(id); navigation?.goBack(); }
    catch (err: any) { Alert.alert("Erro", getErrorMessage(err, "Não foi possível recusar o amistoso.")); }
  };

  if (loading && !friendly) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={TC.lime} />
      </SafeAreaView>
    );
  }

  if (error && !friendly) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: TC.purple }}>
          <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={TC.lime} />}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={19} color={TC.tx} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>Amistoso</Text>
          <View style={{ marginLeft: "auto" }}>
            <StatusPill label={STATUS_LABEL[status] ?? status} tone={STATUS_TONE[status] ?? "neutral"} />
          </View>
        </View>

        {/* VS hero */}
        <View style={{ borderRadius: 22, overflow: "hidden", marginBottom: 24 }}>
          <LinearGradient colors={[TC.purpleDeep, "#140E28"]} style={{ padding: 22, paddingVertical: 26 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TeamBlock name={requesterName} initials={requesterInitials} avatar={friendly?.requesterTeam?.avatarUrl ?? null} role="Desafiante" />
              <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.5 }}>VS</Text>
              <TeamBlock name={challengedName} initials={challengedInitials} avatar={friendly?.challengedTeam?.avatarUrl ?? null} role="Desafiado" />
            </View>
          </LinearGradient>
        </View>

        {/* Info */}
        <Section label="Detalhes" />
        <View style={{ gap: 12, marginBottom: 22 }}>
          <InfoRow icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.purple} strokeWidth={2}><Rect x={3} y={4} width={18} height={18} rx={3} /><Path d="M16 2v4M8 2v4M3 10h18" /></Svg>} label="Data e horário" value={dateTimeStr || "A definir"} />
          {modalityStr.length > 0 && (
            <InfoRow icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.purple} strokeWidth={2}><Circle cx={12} cy={12} r={9} /><Path d="m8 12 3 3 5-5" /></Svg>} label="Modalidade" value={modalityStr} />
          )}
        </View>

        {/* Location — clickable maps */}
        {(locationStr.length > 0 || hasLocation) && (
          <>
            <Section label="Local" />
            <Pressable onPress={hasLocation ? openMaps : undefined} disabled={!hasLocation} accessibilityRole={hasLocation ? "button" : undefined} accessibilityLabel={hasLocation ? "Abrir no mapa" : undefined} style={{ borderRadius: 16, overflow: "hidden", backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, marginBottom: 24 }}>
              <View style={{ height: 100, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center" }}>
                <LinearGradient colors={["rgba(124,58,237,0.35)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%" }} />
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: TC.limeTintBg, borderWidth: 1, borderColor: TC.limeTintBorder, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="location" size={26} color={TC.isDark ? TC.lime : TC.purple} />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 15 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{locationStr || "Local combinado"}</Text>
                </View>
                {hasLocation && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 }}>
                    <Icon name="external" size={14} color={TC.isDark ? TC.lime : TC.purple} />
                    <Text style={{ color: TC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase" }}>Ver no mapa</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </>
        )}

        {/* Referee code */}
        {status === "ACCEPTED" && refereeCode ? (
          <View style={{ backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, borderRadius: 18, padding: 16, marginBottom: 22, alignItems: "center" }}>
            <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Código do árbitro</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              {refereeCode.split("").map((char, i) => (
                <View key={i} style={{ width: 40, height: 46, borderRadius: 10, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.limeTintBorder, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Anton_400Regular", fontSize: 22 }}>{char}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: TC.tx3, fontFamily: "Manrope_400Regular", fontSize: 11 }}>Compartilhe com o árbitro</Text>
          </View>
        ) : null}

        {/* ===== Actions (end of content) ===== */}
        {status === "ACCEPTED" && !refereeCode && (
          <Pressable onPress={handleGenerateCode} accessibilityRole="button" accessibilityLabel="Gerar código de árbitro" style={{ width: "100%", paddingVertical: 15, borderRadius: 16, backgroundColor: TC.purple, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="shield" size={16} color={TC.onAccent} strokeWidth={2} />
            <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Gerar código de árbitro</Text>
          </Pressable>
        )}

        {status === "ACCEPTED" && refereeCode ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Iniciar partida" style={{ position: "relative", marginBottom: 10 }}>
            <View style={{ backgroundColor: TC.purple, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.onAccent} strokeWidth={2.2}><Polygon points="5 3 19 12 5 21 5 3" /></Svg>
              <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Iniciar partida</Text>
            </View>
            <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
            <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
          </Pressable>
        ) : null}

        {status === "ACCEPTED" && (
          <Pressable onPress={handleCancel} accessibilityRole="button" accessibilityLabel="Cancelar amistoso" style={{ width: "100%", paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: TC.dangerTintBorder, backgroundColor: TC.dangerTintBg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="close" size={16} color={TC.danger} strokeWidth={2} />
            <Text style={{ color: TC.danger, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }}>Cancelar amistoso</Text>
          </Pressable>
        )}

        {status === "PENDING" && direction === "received" && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={handleAccept} accessibilityRole="button" accessibilityLabel="Aceitar amistoso" style={{ flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: TC.purple, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Aceitar</Text>
            </Pressable>
            <Pressable onPress={handleReject} accessibilityRole="button" accessibilityLabel="Recusar amistoso" style={{ flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Recusar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const TC = useTC();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 14, padding: 14 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{label}</Text>
        <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}
