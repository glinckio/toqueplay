import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "@/hooks/useApi";
import { notificationsService } from "@/services/notificationsService";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
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
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

type IconName = "trophy" | "users" | "volleyball" | "bell" | "shield" | "check-circle";

// Resolves any backend notification `type` (granular) to an icon + color.
function typeConf(rawType: string): { icon: IconName; color: string } {
  const t = (rawType || "").toUpperCase();
  if (t.startsWith("FRIENDLY")) {
    if (t.includes("ACCEPT")) return { icon: "check-circle", color: "#34D399" };
    if (t.includes("REJECT")) return { icon: "volleyball", color: "#FF6B79" };
    return { icon: "volleyball", color: "#FBBF24" }; // request / generic
  }
  if (t.includes("REFEREE")) return { icon: "shield", color: "#8B5CF6" };
  if (t.includes("TEAM") || t.includes("INVITE")) return { icon: "users", color: "#34D399" };
  if (t.startsWith("MATCH")) return { icon: "volleyball", color: "#C6F82A" };
  if (t.includes("TOURNAMENT") || t.includes("BRACKET") || t.includes("REGISTRATION"))
    return { icon: "trophy", color: "#8B5CF6" };
  if (t.includes("CHAT") || t.includes("MESSAGE")) return { icon: "bell", color: "#60A5FA" };
  return { icon: "bell", color: "#9A94A8" };
}

function getDateGroup(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return formatDate(date, { day: "numeric", month: "short" });
}

function fmtTime(createdAt: string): string {
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return "";
  return formatTime(d);
}

export function NotificationsScreen({ navigation }: any) {
  const C = useScreenColors();
  const { data: page, loading, error, refetch } = useApi(() => notificationsService.list(1, 50), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));
  const notifications = (page?.data ?? []).filter((n) => !n.read);

  const handleMarkAllRead = async () => {
    try { await notificationsService.markAllAsRead(); refetch(); } catch {}
  };
  const handleMarkRead = async (id: string) => {
    try { await notificationsService.markAsRead(id); refetch(); } catch {}
  };

  const handlePressNotification = (notif: (typeof notifications)[number]) => {
    handleMarkRead(notif.id);

    const t = (notif.type || "").toUpperCase();
    const refId = notif.referenceId;
    if (!refId) return;

    if (t === "TEAM_INVITE") {
      navigation?.navigate("TeamInvite", { id: refId, invitationId: refId });
    } else if (t.startsWith("FRIENDLY")) {
      navigation?.navigate("FriendlyDetail", { id: refId });
    } else if (t.startsWith("MATCH") || t === "POINT" || t === "TIMEOUT" || t === "SUBSTITUTION") {
      navigation?.navigate("MatchResult", { matchId: refId });
    } else if (t === "REGISTRATION_CREATED") {
      navigation?.push("TournamentDetail", { id: refId });
      navigation?.push("ManageRegistrations", { tournamentId: refId });
    } else if (t.includes("TOURNAMENT") || t.includes("BRACKET") || t.includes("REGISTRATION") || t === "REFEREE_ASSIGNED" || t === "NEW_TOURNAMENT") {
      navigation?.navigate("TournamentDetail", { id: refId });
    }
  };

  const sections = useMemo(() => {
    const groups = notifications.reduce<Record<string, typeof notifications>>((acc, n) => {
      const group = getDateGroup(n.createdAt);
      if (!acc[group]) acc[group] = [];
      acc[group].push(n);
      return acc;
    }, {});
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const Header = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={19} color={C.tx} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ color: C.limeInk, fontFamily: "Oswald_700Bold", fontSize: 11 }}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} accessibilityRole="button" accessibilityLabel="Marcar todas como lidas" hitSlop={8}>
            <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Marcar todas</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Header />
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
          <Skeleton width={60} height={12} radius={6} />
          <Skeleton height={72} radius={16} />
          <Skeleton height={72} radius={16} />
          <Skeleton height={72} radius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: C.purple }}>
            <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <Header />

      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60, paddingHorizontal: 20 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="bell" size={30} color={C.purple} />
          </View>
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>Tudo em dia</Text>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center", maxWidth: 240, lineHeight: 19 }}>
            Você não tem notificações novas. Avisos de torneios, times e jogos aparecem aqui.
          </Text>
        </View>
      ) : (
        <SectionList
          style={{ paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}
          sections={sections}
          keyExtractor={(notif) => notif.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 12, backgroundColor: C.bg }}>
              <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: C.lime }} />
              <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" }}>{title}</Text>
            </View>
          )}
          renderItem={({ item: notif }) => {
            const conf = typeConf(notif.type);
            const unread = !notif.read;
            return (
              <Pressable
                onPress={() => handlePressNotification(notif)}
                accessibilityRole="button"
                accessibilityLabel={notif.title}
                style={{
                  flexDirection: "row", alignItems: "flex-start", gap: 12,
                  backgroundColor: unread ? "rgba(124,58,237,0.08)" : C.card,
                  borderWidth: 1, borderColor: unread ? "rgba(139,92,246,0.25)" : C.cardBorder,
                  borderRadius: 16, padding: 14, marginBottom: 10, overflow: "hidden",
                }}
              >
                {unread && <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.lime }} />}
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${conf.color}22`, borderWidth: 1, borderColor: `${conf.color}44`, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={conf.icon} size={17} color={conf.color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 13.5, flex: 1 }}>{notif.title}</Text>
                    <Text style={{ color: C.tx3, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 0.5 }}>{fmtTime(notif.createdAt)}</Text>
                  </View>
                  <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, lineHeight: 17, marginTop: 3 }}>{notif.body}</Text>
                </View>
                {unread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime, marginTop: 4 }} />}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
