import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { privacyService } from "@/services/privacyService";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";

const TERMS_ITEMS = [
  {
    icon: "shield" as const,
    title: "Proteção de dados",
    body: "Seus dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD). Coletamos apenas o necessário para o funcionamento do app.",
  },
  {
    icon: "users" as const,
    title: "Compartilhamento",
    body: "Seus dados não são vendidos a terceiros. Compartilhamos apenas com organizadores de torneios nos quais você se inscreve.",
  },
  {
    icon: "bell" as const,
    title: "Comunicações",
    body: "Você pode gerenciar suas preferências de notificação e marketing a qualquer momento nas configurações de privacidade.",
  },
  {
    icon: "edit" as const,
    title: "Seus direitos",
    body: "Você tem direito a acessar, corrigir, exportar e excluir seus dados pessoais. Estas opções estão disponíveis na tela de Privacidade & LGPD.",
  },
];

export function ConsentGateScreen() {
  const { isDark } = useTheme();
  const setHasAcceptedTerms = useAuthStore((s) => s.setHasAcceptedTerms);
  const [submitting, setSubmitting] = useState(false);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0E0B14" : "#F6F4FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#A9A2BC" : "#6B6480";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await privacyService.acceptTerms();
    } catch {
      // offline/dev — still allow proceeding
    }
    setHasAcceptedTerms(true);
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top", "bottom"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: isDark ? "rgba(139,92,246,.15)" : "rgba(124,58,237,.08)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(139,92,246,.3)" : "rgba(124,58,237,.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="shield" size={36} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={1.8} />
          </View>
        </View>

        {/* Title */}
        <Text style={{
          color: titleColor,
          fontFamily: "SpaceGrotesk_700Bold", fontSize: 26, fontWeight: "700",
          textAlign: "center", lineHeight: 30, letterSpacing: -0.02 * 26, marginBottom: 10,
        }}>
          Privacidade &{"\n"}Termos de Uso
        </Text>

        <Text style={{
          color: metaColor,
          fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500",
          textAlign: "center", lineHeight: 20, marginBottom: 28, paddingHorizontal: 10,
        }}>
          Para continuar usando o ToquePlay, leia e aceite nossos termos de uso e política de privacidade.
        </Text>

        {/* Info cards */}
        <View style={{ gap: 12 }}>
          {TERMS_ITEMS.map((item) => (
            <View
              key={item.title}
              style={{
                backgroundColor: cardBg,
                borderWidth: 1, borderColor: cardBorder,
                borderRadius: 18, padding: 16, paddingHorizontal: 18,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.15)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 11,
                  backgroundColor: infoBg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={item.icon} size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                </View>
                <Text style={{
                  color: titleColor,
                  fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700",
                }}>{item.title}</Text>
              </View>
              <Text style={{
                color: metaColor,
                fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500",
                lineHeight: 18, paddingLeft: 48,
              }}>{item.body}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 24 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Termos de uso"
          >
            <Text style={{
              color: isDark ? "#8B5CF6" : "#7C3AED",
              fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600",
              textDecorationLine: "underline",
            }}>Termos de Uso</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Política de privacidade"
          >
            <Text style={{
              color: isDark ? "#8B5CF6" : "#7C3AED",
              fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600",
              textDecorationLine: "underline",
            }}>Política de Privacidade</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34,
        backgroundColor: screenBg,
        borderTopWidth: 1,
        borderTopColor: isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)",
      }}>
        <Pressable
          onPress={handleAccept}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Aceitar e continuar"
          style={{
            backgroundColor: accentColor,
            borderRadius: 16, paddingVertical: 16,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            opacity: submitting ? 0.6 : 1,
            ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={isDark ? "#12100A" : "#fff"} />
          ) : (
            <>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
                <Path d="m5 12 5 5 9-11" />
              </Svg>
              <Text style={{
                color: isDark ? "#12100A" : "#FFFFFF",
                fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700",
                letterSpacing: 0.02 * 15,
              }}>ACEITAR E CONTINUAR</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
