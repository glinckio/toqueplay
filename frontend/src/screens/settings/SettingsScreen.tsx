import React, { useCallback, useRef, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, Switch, Alert, PanResponder } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle } from "react-native-svg";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { privacyService } from "@/services/privacyService";
import { usersService } from "@/services/usersService";
// import { useThemeStore } from "@/stores/themeStore"; // volta junto com o bloco APARENCIA
import { useTheme } from "@/hooks/useTheme";
import { registerForPushNotifications, unregisterCurrentDevice } from "@/hooks/usePushNotifications";

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

function SunIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4.5} stroke={color} strokeWidth={2} />
      <Path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MoonIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const RADIUS_MIN = 10;
const RADIUS_MAX = 200;
const RADIUS_STEP = 5;

function clampRadius(v: number) {
  const snapped = Math.round(v / RADIUS_STEP) * RADIUS_STEP;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, snapped));
}

function RadiusSlider({ value, onChangeEnd }: { value: number; onChangeEnd: (v: number) => void }) {
  const C = useScreenColors();
  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackWidth = useRef(0);
  const accent = C.isDark ? C.lime : C.purple;
  const displayValue = dragValue ?? value;
  const pct = (displayValue - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN);

  const gestureOriginRef = useRef(0);

  const valueFromGesture = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / trackWidth.current));
    return clampRadius(RADIUS_MIN + ratio * (RADIUS_MAX - RADIUS_MIN));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        gestureOriginRef.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (!trackWidth.current) return;
        setDragValue(valueFromGesture(gesture.moveX - gestureOriginRef.current));
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (!trackWidth.current) return;
        const next = valueFromGesture(gesture.moveX - gestureOriginRef.current);
        setDragValue(null);
        onChangeEnd(next);
      },
    })
  ).current;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 26 }}>{displayValue} km</Text>
        <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{RADIUS_MIN}–{RADIUS_MAX} km</Text>
      </View>
      <View
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
        style={{ height: 36, justifyContent: "center" }}
        {...panResponder.panHandlers}
      >
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.10)", overflow: "hidden" }}>
          <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: accent, borderRadius: 3 }} />
        </View>
        <View
          style={{
            position: "absolute", left: `${pct * 100}%`, marginLeft: -11,
            width: 22, height: 22, borderRadius: 11, backgroundColor: accent,
            borderWidth: 3, borderColor: C.bg,
          }}
        />
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const C = useScreenColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: C.lime }} />
      <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

export function SettingsScreen({ navigation }: any) {
  const C = useScreenColors();
  // Seletor de tema desativado — ver bloco APARENCIA comentado mais abaixo.
  // const themeMode = useThemeStore((s) => s.mode);
  // const setModeAndSync = useThemeStore((s) => s.setModeAndSync);
  const { data: consents, refetch: refetchConsents } = useApi(() => privacyService.getConsents(), []);
  const { data: profile, refetch: refetchProfile } = useApi(() => usersService.getProfile(), []);
  useFocusEffect(useCallback(() => { refetchConsents({ keepData: false }); refetchProfile({ keepData: false }); }, [refetchConsents, refetchProfile]));
  const [pushOverride, setPushOverride] = useState<boolean | null>(null);
  const pushValue = pushOverride ?? consents?.notificationsPush ?? false;
  const [emailOverride, setEmailOverride] = useState<boolean | null>(null);
  const emailValue = emailOverride ?? consents?.marketingEmail ?? false;
  const [radiusOverride, setRadiusOverride] = useState<number | null>(null);
  const radiusValue = radiusOverride ?? profile?.nearbyRadiusKm ?? 50;
  const hasLocation = profile?.latitude != null && profile?.longitude != null;

  // Optimistic: flip immediately, only touch state again on failure.
  const handleTogglePush = async () => {
    const current = pushValue;
    const next = !current;

    if (next) {
      const token = await registerForPushNotifications().catch(() => null);
      if (!token) {
        Alert.alert("Permissão negada", "Ative as notificações do ToquePlay nas configurações do seu celular para receber avisos.");
        return;
      }
    } else {
      unregisterCurrentDevice().catch(() => {});
    }

    setPushOverride(next);
    privacyService.updateConsents({ notificationsPush: next }).catch(() => {
      setPushOverride(current);
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
    });
  };

  const handleToggleEmail = () => {
    const current = emailValue;
    const next = !current;
    setEmailOverride(next);
    privacyService.updateConsents({ marketingEmail: next }).catch(() => {
      setEmailOverride(current);
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
    });
  };

  const handleChangeRadius = (next: number) => {
    const current = radiusValue;
    setRadiusOverride(next);
    usersService.updateNearbyRadius(next).catch(() => {
      setRadiusOverride(current);
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView style={{ paddingHorizontal: 22, paddingTop: 16 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
            Configurações
          </Text>
        </View>

        {/* LOCALIZAÇÃO */}
        <SectionLabel label="Localização" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingVertical: 4, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="location" size={18} color={C.isDark ? C.lime : C.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Localização do dispositivo</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>
                {hasLocation ? "Compartilhada · usada para torneios próximos" : "Não definida ainda"}
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: C.cardBorder, marginHorizontal: 16 }} />
          <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginBottom: 12 }}>
              Raio de busca para torneios próximos
            </Text>
            <RadiusSlider value={radiusValue} onChangeEnd={handleChangeRadius} />
          </View>
        </View>

        {/* NOTIFICAÇÕES */}
        <SectionLabel label="Notificações" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingVertical: 4, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.purpleTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={18} color={C.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Notificações push</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>Torneios, times e jogos</Text>
            </View>
            <Switch
              value={pushValue}
              onValueChange={handleTogglePush}
              trackColor={{ false: C.isDark ? "rgba(255,255,255,0.12)" : "rgba(26,16,48,0.15)", true: C.isDark ? C.lime : C.purple }}
              thumbColor={pushValue ? (C.isDark ? C.limeInk : "#FFFFFF") : C.tx3}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              accessibilityLabel="Notificações push"
            />
          </View>

          <View style={{ height: 1, backgroundColor: C.cardBorder, marginHorizontal: 16 }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.purpleTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="mail" size={18} color={C.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Notificações por e-mail</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>Torneios e resultados</Text>
            </View>
            <Switch
              value={emailValue}
              onValueChange={handleToggleEmail}
              trackColor={{ false: C.isDark ? "rgba(255,255,255,0.12)" : "rgba(26,16,48,0.15)", true: C.isDark ? C.lime : C.purple }}
              thumbColor={emailValue ? (C.isDark ? C.limeInk : "#FFFFFF") : C.tx3}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              accessibilityLabel="Notificações por e-mail"
            />
          </View>
        </View>

        {/* APARENCIA — desativado por ora: o app roda so no tema escuro.
            Para reativar: descomente este bloco, os dois seletores do themeStore e o
            import dele. SunIcon/MoonIcon continuam definidos no topo, so sem uso.

        <SectionLabel label="Aparência" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 16, marginBottom: 20 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginBottom: 12 }}>
            Sincroniza com sua conta — muda de aparelho e o tema vai junto
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setModeAndSync("dark")}
              accessibilityRole="button"
              accessibilityLabel="Tema escuro"
              style={{
                flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 14,
                borderWidth: 1.5,
                borderColor: themeMode === "dark" ? C.limeTintBorder : C.cardBorder,
                backgroundColor: themeMode === "dark" ? C.limeTintBg : "transparent",
              }}
            >
              <MoonIcon size={20} color={themeMode === "dark" ? (C.isDark ? C.lime : C.purple) : C.tx3} />
              <Text style={{ color: themeMode === "dark" ? (C.isDark ? C.lime : C.purple) : C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}>Escuro</Text>
            </Pressable>
            <Pressable
              onPress={() => setModeAndSync("light")}
              accessibilityRole="button"
              accessibilityLabel="Tema claro"
              style={{
                flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 14,
                borderWidth: 1.5,
                borderColor: themeMode === "light" ? C.limeTintBorder : C.cardBorder,
                backgroundColor: themeMode === "light" ? C.limeTintBg : "transparent",
              }}
            >
              <SunIcon size={20} color={themeMode === "light" ? (C.isDark ? C.lime : C.purple) : C.tx3} />
              <Text style={{ color: themeMode === "light" ? (C.isDark ? C.lime : C.purple) : C.tx3, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}>Claro</Text>
            </Pressable>
          </View>
        </View>
        */}

        {/* PRIVACIDADE */}
        <SectionLabel label="Privacidade" />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingVertical: 4, marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation?.navigate("Privacy")}
            accessibilityRole="button"
            accessibilityLabel="Privacidade e dados"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.limeTintBg, alignItems: "center", justifyContent: "center" }}>
              <Icon name="shield" size={18} color={C.isDark ? C.lime : C.purple} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Privacidade e dados</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>Consentimentos, exportar, excluir conta</Text>
            </View>
            <Icon name="chevron-right" size={16} color={C.tx3} strokeWidth={2.2} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
