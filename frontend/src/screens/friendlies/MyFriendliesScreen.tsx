import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { friendliesService } from "@/services/friendliesService";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatTime } from "@/utils/dateFormat";
import { useTheme } from "@/hooks/useTheme";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    lime: "#C6F82A",
    limeInk: "#12100A",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
  }), [isDark, colors]);
}

type TabOption = "Recebidos" | "Enviados";

const FORMAT_PT: Record<string, string> = { PAIR: "Dupla", QUARTET: "Quarteto", SEXTET: "Sexteto" };

interface FriendlyCard {
  id: string;
  requesterTeamName: string;
  requesterTeamInitials: string;
  requesterTeamAvatarUrl: string | null;
  challengedTeamName: string;
  challengedTeamInitials: string;
  challengedTeamAvatarUrl: string | null;
  date: string;
  time: string;
  location: string;
  modality: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  direction: "sent" | "received";
  createdAt: string;
}

const STATUS_CONFIG: Record<FriendlyCard["status"], { label: string; color: string; bg: string }> = {
  PENDING: { label: "PENDENTE", color: "#FBBF24", bg: "rgba(251,191,36,0.14)" },
  ACCEPTED: { label: "ACEITO", color: "#C6F82A", bg: "rgba(198,248,42,0.14)" },
  REJECTED: { label: "RECUSADO", color: "#FF6B79", bg: "rgba(239,68,68,0.14)" },
  CANCELLED: { label: "CANCELADO", color: "#9A94A8", bg: "rgba(154,148,168,0.12)" },
  COMPLETED: { label: "CONCLUÍDO", color: "#C6F82A", bg: "rgba(198,248,42,0.14)" },
};

const TEAM_COLORS = [
  { bg: "#1C4A3D", text: "#34D399" },
  { bg: "#2D1B69", text: "#C6F82A" },
  { bg: "#4A1942", text: "#F472B6" },
  { bg: "#3D2A1A", text: "#FBBF24" },
  { bg: "#1B3A5C", text: "#60A5FA" },
];

function getTeamColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  return `${diffD} dias`;
}

function TeamBadge({ name, initials, avatar }: { name: string; initials: string; avatar: string | null }) {
  const col = getTeamColor(name);
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 12 }} />;
  return (
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: col.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: col.text, fontFamily: "Oswald_700Bold", fontSize: 13 }}>{initials}</Text>
    </View>
  );
}

const FriendlyRow = React.memo(function FriendlyRow({ friendly, onAccept, onReject, onViewDetails }: {
  friendly: FriendlyCard;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (id: string) => void;
}) {
  const C = useScreenColors();
  const statusConfBase = STATUS_CONFIG[friendly.status];
  const statusConf = (friendly.status === "ACCEPTED" || friendly.status === "COMPLETED")
    ? { ...statusConfBase, bg: C.limeTintBg, color: C.isDark ? statusConfBase.color : C.purple }
    : statusConfBase;
  const isRejected = friendly.status === "REJECTED";
  const isAccepted = friendly.status === "ACCEPTED";
  const isPending = friendly.status === "PENDING";
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isAccepted ? "rgba(198,248,42,0.2)" : C.cardBorder, borderRadius: 18, padding: 16, marginBottom: 12, opacity: isRejected ? 0.55 : 1 }}>
      {/* Status + time */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20, backgroundColor: statusConf.bg }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: statusConf.color }} />
          <Text style={{ color: statusConf.color, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.8 }}>{statusConf.label}</Text>
        </View>
        <Text style={{ color: C.tx3, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 0.4 }}>{timeAgo(friendly.createdAt)}</Text>
      </View>

      {/* VS row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: isRejected ? 0 : 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <TeamBadge name={friendly.requesterTeamName} initials={friendly.requesterTeamInitials} avatar={friendly.requesterTeamAvatarUrl} />
          <Text numberOfLines={1} style={{ flex: 1, color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{friendly.requesterTeamName}</Text>
        </View>
        <Text style={{ color: C.tx3, fontFamily: "Anton_400Regular", fontSize: 14, letterSpacing: 0.5 }}>VS</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
          <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{friendly.challengedTeamName}</Text>
          <TeamBadge name={friendly.challengedTeamName} initials={friendly.challengedTeamInitials} avatar={friendly.challengedTeamAvatarUrl} />
        </View>
      </View>

      {/* Meta */}
      {!isRejected && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
          {(friendly.date || friendly.time) && (
            <Meta>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth={2}><Rect x={3} y={4} width={18} height={18} rx={3} /><Path d="M16 2v4M8 2v4M3 10h18" /></Svg>
              <MetaText>{friendly.date}{friendly.time ? ` · ${friendly.time}` : ""}</MetaText>
            </Meta>
          )}
          {friendly.location.length > 0 && (
            <Meta>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth={2}><Path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" /><Circle cx={12} cy={9} r={2.5} /></Svg>
              <MetaText>{friendly.location}</MetaText>
            </Meta>
          )}
          {friendly.modality.length > 0 && (
            <Meta>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth={2}><Circle cx={12} cy={12} r={9} /><Path d="M12 8v4M12 16h.01" /></Svg>
              <MetaText>{friendly.modality}</MetaText>
            </Meta>
          )}
        </View>
      )}

      {/* Actions */}
      {isPending && friendly.direction === "received" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => onAccept(friendly.id)} accessibilityRole="button" accessibilityLabel="Aceitar amistoso" style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Aceitar</Text>
          </Pressable>
          <Pressable onPress={() => onReject(friendly.id)} accessibilityRole="button" accessibilityLabel="Recusar amistoso" style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Recusar</Text>
          </Pressable>
        </View>
      )}

      {isAccepted && (
        <Pressable onPress={() => onViewDetails(friendly.id)} accessibilityRole="button" accessibilityLabel="Ver detalhes" style={{ width: "100%", paddingVertical: 12, borderRadius: 12, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Ver detalhes</Text>
          <Icon name="chevron-right" size={14} color={C.isDark ? C.lime : C.purple} />
        </Pressable>
      )}
    </View>
  );
});

export function MyFriendliesScreen({ navigation }: any) {
  const C = useScreenColors();
  const [activeTab, setActiveTab] = useState<TabOption>("Recebidos");
  const user = useAuthStore(s => s.user);
  const { data: friendlies, loading, error, refetch } = useApi(() => friendliesService.findMine(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  const mapped: FriendlyCard[] = useMemo(() => (friendlies ?? []).map(f => {
    const isSender = f.requesterId === user?.id;
    const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return {
      id: f.id,
      requesterTeamName: f.requesterTeam?.name ?? "Time A",
      requesterTeamInitials: getInitials(f.requesterTeam?.name ?? "TA"),
      requesterTeamAvatarUrl: f.requesterTeam?.avatarUrl ?? null,
      challengedTeamName: f.challengedTeam?.name ?? "Time B",
      challengedTeamInitials: getInitials(f.challengedTeam?.name ?? "TB"),
      challengedTeamAvatarUrl: f.challengedTeam?.avatarUrl ?? null,
      date: f.date ? formatDate(f.date, { day: "2-digit", month: "short" }) : "",
      time: f.startTime ? formatTime(f.startTime) : "",
      location: [f.address, f.addressNumber].filter(Boolean).join(", ") || f.city || "",
      modality: (() => {
        const modalityLabel = f.modality === "BEACH" ? "Areia" : f.modality === "INDOOR" ? "Quadra" : (f.modality ?? "");
        const formatLabel = f.modality === "BEACH" ? FORMAT_PT[f.categoryFormat ?? ""] : undefined;
        return [modalityLabel, formatLabel].filter(Boolean).join(" · ");
      })(),
      status: f.status,
      direction: isSender ? "sent" as const : "received" as const,
      createdAt: f.createdAt,
    };
  }), [friendlies, user?.id]);

  const filtered = useMemo(
    () => mapped.filter((f) => activeTab === "Enviados" ? f.direction === "sent" : f.direction === "received"),
    [mapped, activeTab],
  );

  // Accept needs a lineup (backend requires N athletes) → open FriendlyDetail where the picker lives.
  const handleReject = useCallback(async (id: string) => { try { await friendliesService.reject(id); refetch(); } catch {} }, [refetch]);
  const handleAccept = useCallback((id: string) => navigation?.navigate("FriendlyDetail", { id }), [navigation]);
  const handleViewDetails = useCallback((id: string) => navigation?.navigate("FriendlyDetail", { id }), [navigation]);

  const Header = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
          <Icon name="back" size={19} color={C.tx} strokeWidth={2.2} />
        </Pressable>
        <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>Meus amistosos</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 4, marginBottom: 18 }}>
        {(["Recebidos", "Enviados"] as TabOption[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="button" accessibilityLabel={tab} style={{ flex: 1, paddingVertical: 11, borderRadius: 11, backgroundColor: isActive ? C.purple : "transparent", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: isActive ? C.onAccent : C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (loading && !friendlies) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Header />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Skeleton height={150} radius={18} />
          <Skeleton height={150} radius={18} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !friendlies) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: C.purple }}>
          <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <Header />

      <FlatList
        style={{ paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 140, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}
        data={filtered}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FriendlyRow friendly={item} onAccept={handleAccept} onReject={handleReject} onViewDetails={handleViewDetails} />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Icon name="volleyball" size={30} color={C.purple} strokeWidth={1.8} />
            </View>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>Nenhum amistoso</Text>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center", maxWidth: 240 }}>
              {activeTab === "Enviados" ? "Você ainda não enviou convites de amistoso." : "Nenhum convite de amistoso recebido."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>{children}</View>;
}
function MetaText({ children }: { children: React.ReactNode }) {
  const C = useScreenColors();
  return <Text numberOfLines={1} style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</Text>;
}
