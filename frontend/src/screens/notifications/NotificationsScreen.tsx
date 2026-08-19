import React from "react";
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
import { useTheme } from "@/hooks/useTheme";
import { useApi } from "@/hooks/useApi";
import { notificationsService } from "@/services/notificationsService";
import { Icon } from "@/components/ui/Icon";

const TYPE_ICONS: Record<string, { icon: "trophy" | "users" | "volleyball" | "bell" | "shield"; color: string }> = {
  TOURNAMENT: { icon: "trophy", color: "#8B5CF6" },
  TEAM: { icon: "users", color: "#34D399" },
  FRIENDLY: { icon: "volleyball", color: "#FBBF24" },
  MATCH: { icon: "volleyball", color: "#C6F82A" },
  SYSTEM: { icon: "bell", color: "#948CA8" },
};

function getDateGroup(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function NotificationsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const unreadDot = accentColor;
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const { data: page, loading, error, refetch } = useApi(() => notificationsService.list(1, 50), []);
  const notifications = page?.data ?? [];

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      refetch();
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      refetch();
    } catch {}
  };

  const groups = notifications.reduce<Record<string, typeof notifications>>((acc, n) => {
    const group = getDateGroup(n.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={refetch} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: accentColor }}>
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>Tentar novamente</Text>
          </Pressable>
        </View>
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
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>
              Notificações
            </Text>
            {unreadCount > 0 && (
              <View style={{
                minWidth: 20, height: 20, borderRadius: 10,
                backgroundColor: accentColor,
                alignItems: "center", justifyContent: "center",
                paddingHorizontal: 6,
              }}>
                <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel="Marcar todas como lidas"
            >
              <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>
                Marcar todas
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={{ paddingHorizontal: 22 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}>
        {Object.entries(groups).map(([dateGroup, items]) => (
          <View key={dateGroup}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: 10, marginTop: 8 }}>
              {dateGroup.toUpperCase()}
            </Text>
            {items.map((notif) => {
              const typeConf = TYPE_ICONS[notif.type] || TYPE_ICONS.SYSTEM;
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => handleMarkRead(notif.id)}
                  accessibilityRole="button"
                  accessibilityLabel={notif.title}
                  style={{
                    flexDirection: "row", alignItems: "flex-start", gap: 12,
                    backgroundColor: notif.read ? cardBg : (isDark ? "rgba(139,92,246,.06)" : "rgba(124,58,237,.04)"),
                    borderWidth: 1,
                    borderColor: notif.read ? cardBorder : (isDark ? "rgba(139,92,246,.15)" : "rgba(124,58,237,.1)"),
                    borderRadius: 16, padding: 14, marginBottom: 10,
                    ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.12)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
                  }}
                >
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    backgroundColor: infoBg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={typeConf.icon} size={16} color={typeConf.color} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700", flex: 1 }}>
                        {notif.title}
                      </Text>
                      <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>
                        {notif.createdAt}
                      </Text>
                    </View>
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 3 }}>
                      {notif.body}
                    </Text>
                  </View>
                  {!notif.read && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: unreadDot, marginTop: 4 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
