import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { AuthStackParamList } from "@/navigation/types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1530869685324-333806073961?fm=jpg&w=820&q=75&auto=format&fit=crop";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(async () => {
    if (!email.trim()) {
      setError("Informe seu email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const linkColor = isDark ? "#8B5CF6" : "#7C3AED";

  // "Enviado" state
  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#0E0B14" : "#F6F4FC", paddingHorizontal: 22, paddingTop: 20 }}>
        <StatusBar barStyle="light-content" />

        {/* Back button */}
        <Pressable
          onPress={() => setSent(false)}
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: isDark ? "#1C1630" : "#fff",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)",
            alignItems: "center", justifyContent: "center", marginBottom: 70,
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2}>
            <Path d="m15 6-6 6 6 6" />
          </Svg>
        </Pressable>

        {/* Mail+check icon */}
        <View style={{
          width: 88, height: 88, borderRadius: 28,
          backgroundColor: "rgba(198,248,42,0.14)",
          borderWidth: 1, borderColor: "rgba(198,248,42,0.3)",
          alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 26,
        }}>
          <Svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="#C6F82A" strokeWidth={2}>
            <Rect x={3} y={5} width={18} height={14} rx={3} />
            <Path d="m3 7 9 6 9-6" />
            <Path d="m15 14 2.5 2.5L22 12" />
          </Svg>
        </View>

        <Text style={{ textAlign: "center", color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.01 * 22, marginBottom: 10 }}>
          Código enviado
        </Text>
        <Text style={{ textAlign: "center", color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 20.8, paddingHorizontal: 6, marginBottom: 34 }}>
          Enviamos um código de 6 dígitos para{"\n"}
          <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "Manrope_700Bold", fontWeight: "700" }}>{email}</Text>
          . Ele expira em 15 minutos.
        </Text>

        <Pressable
          onPress={() => navigation.navigate("ResetPassword", { email: email.trim() })}
          style={{
            width: "100%", backgroundColor: accentColor, paddingVertical: 15, borderRadius: 16, alignItems: "center", marginBottom: 14,
            ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
          }}
        >
          <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
            INSERIR CÓDIGO
          </Text>
        </Pressable>

        <Text style={{ textAlign: "center", color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
          Não recebeu?{" "}
          <Text onPress={() => { setSent(false); handleSend(); }} style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontWeight: "700" }}>
            Reenviar
          </Text>
        </Text>
      </View>
    );
  }

  // Default state — hero + email form
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0E0B14" : "#F6F4FC" }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Hero — 236px */}
          <View style={{ height: 236, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden" }}>
            <Image source={{ uri: HERO_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
            <LinearGradient
              colors={["rgba(6,4,12,0.5)", "rgba(6,4,12,0.04)", "rgba(6,4,12,0.12)", "rgba(6,4,12,0.82)"]}
              locations={[0, 0.3, 0.52, 1]}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            {/* Back button in hero */}
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                position: "absolute", top: 48, left: 22, width: 38, height: 38, borderRadius: 12,
                backgroundColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.24)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                <Path d="m15 6-6 6 6 6" />
              </Svg>
            </Pressable>
            {/* Title */}
            <View style={{ position: "absolute", left: 22, right: 22, bottom: 26 }}>
              <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 28, fontWeight: "700", lineHeight: 29.4, letterSpacing: -0.01 * 28 }}>
                {"Recuperar\nsua senha"}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
            <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 20.15, marginBottom: 24 }}>
              Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos para você criar uma nova senha.
            </Text>

            {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={error && error !== "Informe seu email" ? undefined : (error || undefined)}
            />

            <Pressable
              onPress={handleSend}
              disabled={loading}
              style={{
                width: "100%", backgroundColor: accentColor, paddingVertical: 15, borderRadius: 16, alignItems: "center",
                marginTop: 22, opacity: loading ? 0.7 : 1,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
                {loading ? "ENVIANDO..." : "ENVIAR CÓDIGO"}
              </Text>
            </Pressable>

            {/* Back to login */}
            <Pressable onPress={() => navigation.navigate("Login")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22 }}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth={2.2}>
                <Path d="m15 6-6 6 6 6" />
              </Svg>
              <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>
                Voltar para o login
              </Text>
            </Pressable>

            {/* Info card */}
            <View style={{
              marginTop: 26, flexDirection: "row", gap: 11,
              backgroundColor: isDark ? "#171221" : "#fff",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)",
              borderRadius: 16, padding: 14, paddingRight: 15,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 }),
            }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                <Circle cx={12} cy={12} r={9} />
                <Path d="M12 8v5M12 16.5h.01" />
              </Svg>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", lineHeight: 18, flex: 1 }}>
                O código expira em 15 minutos. Verifique também a caixa de spam.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
