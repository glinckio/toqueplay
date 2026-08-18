import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";

interface ConsentToggle {
  key: string;
  label: string;
  description: string;
  value: boolean;
}

const MOCK_DATA_SUMMARY = {
  teams: 3,
  tournaments: 8,
  matches: 24,
  registrations: 12,
  friendlies: 5,
  notifications: 47,
};

export function PrivacyScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const [consents, setConsents] = useState<ConsentToggle[]>([
    { key: "notificationsPush", label: "Notificações push", description: "Receber notificações sobre partidas e torneios", value: true },
    { key: "locationDiscovery", label: "Localização", description: "Usar localização para descobrir torneios próximos", value: true },
    { key: "marketingEmail", label: "Emails de marketing", description: "Receber novidades e promoções por email", value: false },
  ]);

  const handleToggleConsent = (key: string) => {
    setConsents((prev) =>
      prev.map((c) => c.key === key ? { ...c, value: !c.value } : c)
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Exportar dados",
      "Um arquivo com todos os seus dados será enviado para seu email. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Exportar", onPress: () => Alert.alert("Sucesso", "Exportação iniciada. Você receberá um email em breve.") },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir conta",
      "Esta ação é irreversível. Todos os seus dados serão anonimizados. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir minha conta", style: "destructive", onPress: () => {} },
      ]
    );
  };

  const handleDpoContact = () => {
    Alert.alert("Contato DPO", "Envie um email para dpo@toqueplay.com.br para exercer seus direitos LGPD.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 22, paddingTop: 14 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
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
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>
            Privacidade & LGPD
          </Text>
        </View>

        {/* Consents */}
        <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: 10 }}>
          CONSENTIMENTOS
        </Text>
        <View style={{
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 18, padding: 4, marginBottom: 20,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          {consents.map((consent, i) => (
            <View key={consent.key}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>{consent.label}</Text>
                  <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>{consent.description}</Text>
                </View>
                <Switch
                  value={consent.value}
                  onValueChange={() => handleToggleConsent(consent.key)}
                  trackColor={{
                    false: isDark ? "rgba(255,255,255,.12)" : "rgba(26,16,48,.1)",
                    true: accentColor,
                  }}
                  thumbColor={consent.value ? (isDark ? "#12100A" : "#fff") : (isDark ? "#6E6684" : "#A29CB4")}
                  accessibilityLabel={consent.label}
                />
              </View>
              {i < consents.length - 1 && <View style={{ height: 1, backgroundColor: dividerColor, marginHorizontal: 14 }} />}
            </View>
          ))}
        </View>

        {/* Data summary */}
        <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: 10 }}>
          SEUS DADOS
        </Text>
        <View style={{
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 18, padding: 16, marginBottom: 20,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Times", value: MOCK_DATA_SUMMARY.teams },
              { label: "Torneios", value: MOCK_DATA_SUMMARY.tournaments },
              { label: "Partidas", value: MOCK_DATA_SUMMARY.matches },
              { label: "Inscrições", value: MOCK_DATA_SUMMARY.registrations },
              { label: "Amistosos", value: MOCK_DATA_SUMMARY.friendlies },
              { label: "Notificações", value: MOCK_DATA_SUMMARY.notifications },
            ].map((item) => (
              <View key={item.label} style={{
                width: "30%", backgroundColor: infoBg,
                borderRadius: 12, padding: 10, alignItems: "center",
              }}>
                <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" }}>{item.value}</Text>
                <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 9, fontWeight: "500" }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: 10 }}>
          AÇÕES
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {/* Export */}
          <Pressable
            onPress={handleExportData}
            accessibilityRole="button"
            accessibilityLabel="Exportar meus dados"
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 14, padding: 14, paddingHorizontal: 16,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.15)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: infoBg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="download" size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>Exportar meus dados</Text>
              <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>LGPD Art. 18, V — Portabilidade</Text>
            </View>
            <Icon name="chevron-right" size={16} color={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
          </Pressable>

          {/* DPO Contact */}
          <Pressable
            onPress={handleDpoContact}
            accessibilityRole="button"
            accessibilityLabel="Contato DPO"
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 14, padding: 14, paddingHorizontal: 16,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.15)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: infoBg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="mail" size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>Contato DPO</Text>
              <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>Exercer seus direitos LGPD</Text>
            </View>
            <Icon name="chevron-right" size={16} color={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
          </Pressable>

          {/* Delete account */}
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Excluir minha conta"
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              borderWidth: 1,
              borderColor: isDark ? "rgba(239,68,68,.3)" : "rgba(239,68,68,.2)",
              backgroundColor: isDark ? "rgba(239,68,68,.08)" : "rgba(239,68,68,.05)",
              borderRadius: 14, padding: 14, paddingHorizontal: 16,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: isDark ? "rgba(239,68,68,.12)" : "rgba(239,68,68,.08)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="trash" size={16} color="#EF4444" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#EF4444", fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>Excluir minha conta</Text>
              <Text style={{ color: isDark ? "rgba(239,68,68,.7)" : "rgba(239,68,68,.6)", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>LGPD Art. 18, VI — Eliminação</Text>
            </View>
            <Icon name="chevron-right" size={16} color="rgba(239,68,68,.5)" strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
