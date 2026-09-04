import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Svg, { Path, Circle } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { privacyService } from "@/services/privacyService";
import { useAuthStore } from "@/stores/authStore";
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
    danger: "#FF4D5E",
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

function SectionLabel({ label, danger }: { label: string; danger?: boolean }) {
  const C = useScreenColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: danger ? C.danger : C.lime }} />
      <Text style={{ color: danger ? C.danger : C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

export function PrivacyScreen({ navigation }: any) {
  const C = useScreenColors();
  const user = useAuthStore((s) => s.user);
  const {
    data: consentsData,
    loading: loadingConsents,
    error,
    refetch: refetchConsents,
  } = useApi(() => privacyService.getConsents(), []);
  const { data: dataSummary, loading: loadingSummary, refetch: refetchSummary } = useApi(
    () => privacyService.getDataSummary(),
    []
  );
  useFocusEffect(useCallback(() => { refetchConsents({ keepData: false }); refetchSummary({ keepData: false }); }, [refetchConsents, refetchSummary]));
  const loading = loadingConsents || loadingSummary;

  const [confirmExportVisible, setConfirmExportVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmDpoVisible, setConfirmDpoVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Termos de Uso e Política de Privacidade são aceitos obrigatoriamente no
  // gate de consentimento (login) — aparecem aqui já ativados e travados,
  // sem toggle, pois não são opcionais.
  const lockedConsents = [
    { key: "terms", label: "Termos de Uso", description: "Obrigatório · v3.2" },
    { key: "privacyPolicy", label: "Política de Privacidade", description: "Obrigatório · v3.2" },
  ];

  const confirmExportData = async () => {
    setExporting(true);
    try {
      await privacyService.exportData();
      Alert.alert("Sucesso", "Exportação iniciada. Você receberá um email em breve.");
    } catch {} finally {
      setExporting(false);
      setConfirmExportVisible(false);
    }
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await privacyService.deleteAccount(user?.email ?? "");
    } catch {} finally {
      setDeleting(false);
      setConfirmDeleteVisible(false);
    }
  };

  const handleDpoContact = () => setConfirmDpoVisible(true);

  // -- Loading state --
  if (loading && !consentsData && !dataSummary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={C.lime} />
      </SafeAreaView>
    );
  }

  // -- Error state --
  if (error && !consentsData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={() => refetchConsents()} accessibilityRole="button">
          <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView
        style={{ paddingHorizontal: 22, paddingTop: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetchConsents} tintColor={C.lime} />}
      >
        {/* Header */}
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
            Privacidade
          </Text>
        </View>

        {/* Shield card */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(198,248,42,0.2)", borderRadius: 22, padding: 20, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path d="M12 2l7 4v5c0 5.25-3.5 8.25-7 10-3.5-1.75-7-4.75-7-10V6l7-4z" stroke={C.isDark ? C.lime : C.purple} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="m9 12 2 2 4-4" stroke={C.isDark ? C.lime : C.purple} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <View>
            <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>Seus dados estão protegidos</Text>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 3 }}>LGPD · Lei 13.709/2018</Text>
          </View>
        </View>

        {/* CONSENTIMENTOS */}
        <SectionLabel label="Consentimentos" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingVertical: 4, marginBottom: 20 }}>
          {lockedConsents.map((consent, i) => (
            <View key={consent.key}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{consent.label}</Text>
                  <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>{consent.description}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.limeTintBg, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}>
                  <Icon name="check" size={13} color={C.isDark ? C.lime : C.purple} strokeWidth={2.6} />
                  <Text style={{ color: C.isDark ? C.lime : C.purple, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>Aceito</Text>
                </View>
              </View>
              {i < lockedConsents.length - 1 && (
                <View style={{ height: 1, backgroundColor: C.cardBorder, marginHorizontal: 16 }} />
              )}
            </View>
          ))}
        </View>

        {/* MEUS DADOS */}
        <SectionLabel label="Meus dados" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingVertical: 4, marginBottom: 20 }}>
          {/* Exportar meus dados */}
          <Pressable
            onPress={() => setConfirmExportVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Exportar meus dados"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="download" size={18} color={C.isDark ? C.lime : C.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Exportar meus dados</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>Download em JSON · LGPD Art. 18</Text>
            </View>
            <Icon name="chevron-right" size={16} color={C.tx3} strokeWidth={2.2} />
          </Pressable>

          <View style={{ height: 1, backgroundColor: C.cardBorder, marginHorizontal: 16 }} />

          {/* Historico de consentimentos */}
          <Pressable
            onPress={() => navigation?.navigate("ConsentHistory")}
            accessibilityRole="button"
            accessibilityLabel="Historico de consentimentos"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={9} stroke={C.isDark ? C.lime : C.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 7v5l3 3" stroke={C.isDark ? C.lime : C.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Histórico de consentimentos</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>Últimas alterações</Text>
            </View>
            <Icon name="chevron-right" size={16} color={C.tx3} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ENCARREGADO DE DADOS (DPO) */}
        <SectionLabel label="Encarregado de dados (DPO)" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="user" size={20} color={C.isDark ? C.lime : C.purple} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Responsável pela Proteção de Dados</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>dpo@toqueplay.com.br</Text>
            </View>
          </View>
          <Pressable
            onPress={handleDpoContact}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem ao DPO"
            style={{ width: "100%", borderWidth: 1, borderColor: "rgba(198,248,42,0.25)", backgroundColor: "rgba(198,248,42,0.08)", borderRadius: 12, paddingVertical: 11, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Enviar mensagem ao DPO
            </Text>
          </Pressable>
        </View>

        {/* ZONA DE PERIGO */}
        <SectionLabel label="Zona de perigo" danger />
        <View style={{ backgroundColor: "rgba(255,77,94,0.05)", borderWidth: 1, borderColor: "rgba(255,77,94,0.16)", borderRadius: 18, padding: 16, marginBottom: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,77,94,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke={C.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke={C.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Excluir minha conta</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 15.4, marginTop: 2 }}>
                Todos os dados serão apagados permanentemente. Essa ação é irreversível.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setConfirmDeleteVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Excluir conta"
            style={{ width: "100%", borderWidth: 1, borderColor: "rgba(255,77,94,0.35)", backgroundColor: "rgba(255,77,94,0.1)", borderRadius: 12, paddingVertical: 11, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: C.danger, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Excluir conta
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmExportVisible}
        title="Exportar dados"
        message="Um arquivo com todos os seus dados será enviado para seu email. Deseja continuar?"
        cancelLabel="Cancelar"
        actionLabel="Exportar"
        loading={exporting}
        onCancel={() => setConfirmExportVisible(false)}
        onConfirm={confirmExportData}
      />

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Excluir conta"
        message="Esta ação é irreversível. Todos os seus dados serão anonimizados. Deseja continuar?"
        cancelLabel="Cancelar"
        actionLabel="Excluir"
        danger
        loading={deleting}
        onCancel={() => setConfirmDeleteVisible(false)}
        onConfirm={confirmDeleteAccount}
      />

      <ConfirmDialog
        visible={confirmDpoVisible}
        title="Contato DPO"
        message="Envie um email para dpo@toqueplay.com.br para exercer seus direitos LGPD."
        cancelLabel="Fechar"
        actionLabel="Entendi"
        onCancel={() => setConfirmDpoVisible(false)}
        onConfirm={() => setConfirmDpoVisible(false)}
      />
    </SafeAreaView>
  );
}
