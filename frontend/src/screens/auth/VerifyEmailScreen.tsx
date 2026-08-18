import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { OTPInput } from "@/components/ui/OTPInput";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { AuthStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { isDark, colors } = useTheme();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(48);
  const [expirySeconds, setExpirySeconds] = useState(600);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
      setExpirySeconds((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const result = await authService.verifyEmail(email, code);
      setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          ...result.user,
          role: (result.user.role as any) ?? "ATLETA",
          twoFactorEnabled: false,
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Código inválido. Verifique e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [code, email, setAuth]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    try {
      await authService.resendCode(email);
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch {
      setError("Erro ao reenviar código");
    }
  }, [email, resendCooldown]);

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code, handleVerify]);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const linkColor = isDark ? "#8B5CF6" : "#7C3AED";
  const expiryMin = Math.floor(expirySeconds / 60).toString().padStart(2, "0");
  const expirySec = (expirySeconds % 60).toString().padStart(2, "0");
  const hasError = !!error;

  const iconBg = hasError
    ? "rgba(239,68,68,0.1)"
    : (isDark ? "rgba(139,92,246,0.1)" : "rgba(124,58,237,0.08)");
  const iconStroke = hasError ? "#EF4444" : (isDark ? "#8B5CF6" : "#7C3AED");

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F6F4FC", paddingHorizontal: 22, paddingTop: 20 }}>
      <BackButton title="Voltar" onPress={() => navigation.goBack()} />

      {/* Mail icon */}
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 32, marginBottom: 24 }}>
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth={1.6}>
          <Rect x={3} y={5} width={18} height={14} rx={3} />
          <Path d="m3 7 9 6 9-6" />
        </Svg>
      </View>

      {/* Title */}
      <Text style={{ textAlign: "center", color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24 }}>
        Verifique seu e-mail
      </Text>
      <Text style={{ textAlign: "center", color: isDark ? "#948CA8" : "#6B6480", fontFamily: "Manrope_400Regular", fontSize: 13.5, fontWeight: "400", lineHeight: 21.6, marginTop: 10 }}>
        Enviamos um código de 6 dígitos para{"\n"}
        <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}>{email}</Text>
      </Text>

      {/* Error banner */}
      {hasError && (
        <Banner variant="error" message={error} style={{ marginTop: 24 }} />
      )}

      {/* OTP */}
      <View style={{ marginTop: hasError ? 18 : 32 }}>
        <OTPInput value={code} onChange={setCode} error={error || undefined} />
      </View>

      {/* Expiry */}
      <Text style={{ textAlign: "center", color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_400Regular", fontSize: 12, fontWeight: "400", marginTop: 14 }}>
        Código expira em <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}>{expiryMin}:{expirySec}</Text>
      </Text>

      {/* Verify button */}
      <Pressable
        onPress={handleVerify}
        disabled={code.length !== 6 || loading}
        style={{
          width: "100%",
          backgroundColor: code.length === 6
            ? accentColor
            : (isDark ? "rgba(198,248,42,0.25)" : "rgba(124,58,237,0.25)"),
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: "center",
          marginTop: 28,
        }}
      >
        <Text style={{
          color: code.length === 6
            ? (isDark ? "#12100A" : "#fff")
            : (isDark ? "rgba(18,16,10,0.4)" : "rgba(255,255,255,0.5)"),
          fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14,
        }}>
          {loading ? "VERIFICANDO..." : "VERIFICAR"}
        </Text>
      </Pressable>

      {/* Resend */}
      <Text style={{ textAlign: "center", marginTop: 20, color: isDark ? "#948CA8" : "#8A829E", fontFamily: "Manrope_400Regular", fontSize: 13, fontWeight: "400" }}>
        Não recebeu?{" "}
        {resendCooldown > 0 ? (
          <Text style={{ color: isDark ? "#6E6684" : "#A29CB4", fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}>
            Reenviar em {Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, "0")}
          </Text>
        ) : (
          <Text onPress={handleResend} style={{ color: linkColor, fontFamily: "Manrope_600SemiBold", fontWeight: "600" }}>
            Reenviar código
          </Text>
        )}
      </Text>

      {/* Open email app */}
      <Pressable onPress={() => {}} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth={2}>
          <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <Path d="M15 3h6v6" />
          <Path d="M10 14L21 3" />
        </Svg>
        <Text style={{ color: linkColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>
          Abrir app de e-mail
        </Text>
      </Pressable>
    </View>
  );
}
