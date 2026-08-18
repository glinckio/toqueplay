import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  dateGroup: string;
}

const TYPE_ICONS: Record<string, { icon: "trophy" | "users" | "volleyball" | "bell" | "shield"; color: string }> = {
  TOURNAMENT: { icon: "trophy", color: "#8B5CF6" },
  TEAM: { icon: "users", color: "#34D399" },
  FRIENDLY: { icon: "volleyball", color: "#FBBF24" },
  MATCH: { icon: "volleyball", color: "#C6F82A" },
  SYSTEM: { icon: "bell", color: "#948CA8" },
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "Inscrição confirmada", body: "Sua inscrição na Copa Verão 2026 foi confirmada.", type: "TOURNAMENT", read: false, createdAt: "14:30", dateGroup: "Hoje" },
  { id: "n2", title: "Novo convite de time", body: "Beach Titans convidou você para a dupla.", type: "TEAM", read: false, createdAt: "11:15", dateGroup: "Hoje" },
  { id: "n3", title: "Amistoso aceito", body: "Vôlei Sul aceitou seu convite de amistoso.", type: "FRIENDLY", read: true, createdAt: "09:00", dateGroup: "Hoje" },
  { id: "n4", title: "Partida encerrada", body: "Silva & Rocha venceu por 2×0 contra Sand Storm.", type: "MATCH", read: true, createdAt: "18:45", dateGroup: "Ontem" },
  { id: "n5", title: "Torneio publicado", body: "Copa Inverno 2026 está com inscrições abertas.", type: "TOURNAMENT", read: true, createdAt: "10:00", dateGroup: "Ontem" },
  { id: "n6", title: "Atualização de privacidade", body: "Nossos termos de uso foram atualizados.", type: "SYSTEM", read: true, createdAt: "08:00", dateGroup: "15 Ago" },
];

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

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const groups = notifications.reduce<Record<string, NotificationItem[]>>((acc, n) => {
    if (!acc[n.dateGroup]) acc[n.dateGroup] = [];
    acc[n.dateGroup].push(n);
    return acc;
  }, {});

  const unreadCount = notifications.filter((n) => !n.read).length;

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

      <ScrollView style={{ paddingHorizontal: 22 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
