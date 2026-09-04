import React, { useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { privacyService, ConsentHistoryEntry } from "@/services/privacyService";
import { formatDate, formatTime } from "@/utils/dateFormat";
import { useTheme } from "@/hooks/useTheme";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    lime: "#C6F82A",
    purple: "#7C3AED",
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

const PURPOSE_LABEL: Record<ConsentHistoryEntry["purpose"], string> = {
  TERMS: "Termos de Uso e Política de Privacidade",
  NOTIFICATIONS_PUSH: "Notificações push",
  LOCATION_DISCOVERY: "Localização para descoberta",
  MARKETING_EMAIL: "Notificações por e-mail",
};

export function ConsentHistoryScreen({ navigation }: any) {
  const C = useScreenColors();
  const { data: history, loading, error, refetch } = useApi(() => privacyService.getConsentHistory(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => navigation?.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="back" size={19} color={C.tx2} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Histórico de consentimentos
          </Text>
        </View>
      </View>

      {loading && !history ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={C.lime} />
        </View>
      ) : error && !history ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={{ paddingHorizontal: 22 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(history ?? []).length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center" }}>
                Nenhum registro de consentimento encontrado.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {(history ?? []).map((entry) => (
                <View
                  key={entry.id}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
                    borderRadius: 16, padding: 14,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 12,
                    backgroundColor: entry.accepted ? C.limeTintBg : "rgba(255,77,94,0.12)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={entry.accepted ? "check" : "close"} size={16} color={entry.accepted ? (C.isDark ? C.lime : C.purple) : C.danger} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>
                      {PURPOSE_LABEL[entry.purpose] ?? entry.purpose}
                    </Text>
                    <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>
                      {entry.accepted ? "Aceito" : "Recusado"} · v{entry.version} · {formatDate(entry.createdAt, { day: "numeric", month: "short", year: "numeric" })} às {formatTime(entry.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
