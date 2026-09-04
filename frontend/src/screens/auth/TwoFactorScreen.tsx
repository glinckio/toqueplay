import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path, Circle } from "react-native-svg";
import { OTPInput } from "@/components/ui/OTPInput";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { AuthStackParamList } from "@/navigation/types";
import { useAC } from "./_authKit";

type Props = NativeStackScreenProps<AuthStackParamList, "TwoFactor">;

export function TwoFactorScreen({ navigation, route }: Props) {
  const AC = useAC();
  const { temporaryToken } = route.params;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = useCallback(async () => {
    if (code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const result = await authService.verify2fa(temporaryToken, code);
      setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          ...result.user,
          role: (result.user.role as any) ?? "ATLETA",
          twoFactorEnabled: true,
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Código inválido");
      setCode("");
    } finally {
      setLoading(false);
    }
  }, [code, temporaryToken, setAuth]);

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code, handleVerify]);

  const hasError = !!error;
  const iconBg = hasError ? "rgba(255,77,94,0.12)" : AC.limeTintBg;
  const iconStroke = hasError ? AC.danger : (AC.isDark ? AC.lime : AC.purple);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AC.bg }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
          <BackButton title="Voltar" onPress={() => navigation.goBack()} />

          {/* Shield icon */}
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 32, marginBottom: 24 }}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth={1.6}>
              <Path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
            </Svg>
          </View>

          {/* Title */}
          <Text style={{ textAlign: "center", color: AC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Autenticação 2FA
          </Text>
          <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_400Regular", fontSize: 13.5, lineHeight: 21.6, marginTop: 10 }}>
            Digite o código de 6 dígitos do seu{"\n"}aplicativo autenticador
          </Text>

          {/* Error banner */}
          {hasError && (
            <Banner variant="error" message={error} style={{ marginTop: 24 }} />
          )}

          {/* OTP */}
          <View style={{ marginTop: hasError ? 18 : 32 }}>
            <OTPInput value={code} onChange={setCode} error={error || undefined} />
          </View>

          {/* Verify button */}
          <Pressable
            onPress={handleVerify}
            disabled={code.length !== 6 || loading}
            style={{
              width: "100%",
              backgroundColor: code.length === 6 ? AC.purple : "rgba(124,58,237,0.3)",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              marginTop: 28,
            }}
          >
            <Text style={{
              color: code.length === 6 ? AC.onAccent : "rgba(255,255,255,0.5)",
              fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase",
            }}>
              {loading ? "Verificando..." : "Verificar"}
            </Text>
          </Pressable>

          {/* Info card */}
          <View style={{
            marginTop: 26, flexDirection: "row", gap: 11,
            backgroundColor: AC.card,
            borderWidth: 1, borderColor: AC.cardBorder,
            borderRadius: 16, padding: 14, paddingRight: 15,
          }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={AC.lime} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 8v5M12 16.5h.01" />
            </Svg>
            <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, lineHeight: 18, flex: 1 }}>
              Use o código temporário do Google Authenticator ou app similar.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
