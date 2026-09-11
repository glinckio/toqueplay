import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Rect, Path } from "react-native-svg";
import { OTPInput } from "@/components/ui/OTPInput";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { getErrorCode, getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { AuthStackParamList } from "@/navigation/types";
import { useAC } from "./_authKit";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const AC = useAC();
  const { email, autoResend } = route.params;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(autoResend ? "Enviando um novo código para você..." : "");
  const [resendCooldown, setResendCooldown] = useState(48);
  const [expirySeconds, setExpirySeconds] = useState(600);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const autoResendDone = useRef(false);

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
    } catch (err: unknown) {
      setNotice("");
      setError(getErrorMessage(err, "Código inválido. Verifique e tente novamente."));
    } finally {
      setLoading(false);
    }
  }, [code, email, setAuth]);

  const sendNewCode = useCallback(async () => {
    setError("");
    try {
      await authService.resendCode(email);
      setResendCooldown(60);
      setExpirySeconds(600);
      setNotice(`Enviamos um novo código para ${email}.`);
    } catch (err: unknown) {
      // A API recusa dois envios em menos de 1 minuto. Nesse caso o código anterior continua
      // valendo, então isso é aviso, não falha — dizer "erro" faria o usuário achar que travou.
      if (getErrorCode(err) === "CODE_RESEND_COOLDOWN") {
        setResendCooldown(60);
        setNotice("O código que enviamos há pouco ainda é válido. Confira seu e-mail.");
        return;
      }
      setNotice("");
      setError(getErrorMessage(err, "Erro ao reenviar código"));
    }
  }, [email]);

  const handleResend = useCallback(() => {
    if (resendCooldown > 0) return;
    void sendNewCode();
  }, [resendCooldown, sendNewCode]);

  // Chegou pelo login com e-mail pendente: dispara um código novo sozinho, uma vez só.
  useEffect(() => {
    if (!autoResend || autoResendDone.current) return;
    autoResendDone.current = true;
    void sendNewCode();
  }, [autoResend, sendNewCode]);

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code, handleVerify]);

  const expiryMin = Math.floor(expirySeconds / 60).toString().padStart(2, "0");
  const expirySec = (expirySeconds % 60).toString().padStart(2, "0");
  const hasError = !!error;

  const iconBg = hasError ? "rgba(255,77,94,0.12)" : AC.limeTintBg;
  const iconStroke = hasError ? AC.danger : (AC.isDark ? AC.lime : AC.purple);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AC.bg }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
          <BackButton title="Voltar" onPress={() => navigation.goBack()} />

          {/* Mail icon */}
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 32, marginBottom: 24 }}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth={1.6}>
              <Rect x={3} y={5} width={18} height={14} rx={3} />
              <Path d="m3 7 9 6 9-6" />
            </Svg>
          </View>

          {/* Title */}
          <Text style={{ textAlign: "center", color: AC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Verifique seu e-mail
          </Text>
          <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_400Regular", fontSize: 13.5, lineHeight: 21.6, marginTop: 10 }}>
            Enviamos um código de 6 dígitos para{"\n"}
            <Text style={{ color: AC.lime, fontFamily: "Manrope_700Bold" }}>{email}</Text>
          </Text>

          {/* Error banner */}
          {hasError && (
            <Banner variant="error" message={error} style={{ marginTop: 24 }} />
          )}

          {/* Aviso de reenvio (some assim que der erro de codigo) */}
          {!hasError && !!notice && (
            <Banner variant="info" message={notice} style={{ marginTop: 24 }} />
          )}

          {/* OTP */}
          <View style={{ marginTop: hasError || notice ? 18 : 32 }}>
            <OTPInput value={code} onChange={setCode} error={error || undefined} />
          </View>

          {/* Expiry */}
          <Text style={{ textAlign: "center", color: AC.tx3, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 14 }}>
            Código expira em <Text style={{ color: AC.lime, fontFamily: "Manrope_700Bold" }}>{expiryMin}:{expirySec}</Text>
          </Text>

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

          {/* Resend */}
          <Text style={{ textAlign: "center", marginTop: 20, color: AC.tx2, fontFamily: "Manrope_400Regular", fontSize: 13 }}>
            Não recebeu?{" "}
            {resendCooldown > 0 ? (
              <Text style={{ color: AC.tx3, fontFamily: "Manrope_600SemiBold" }}>
                Reenviar em {Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, "0")}
              </Text>
            ) : (
              <Text onPress={handleResend} style={{ color: AC.link, fontFamily: "Manrope_700Bold" }}>
                Reenviar código
              </Text>
            )}
          </Text>

          {/* Open email app */}
          <Pressable onPress={() => {}} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={AC.lime} strokeWidth={2}>
              <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <Path d="M15 3h6v6" />
              <Path d="M10 14L21 3" />
            </Svg>
            <Text style={{ color: AC.lime, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>
              Abrir app de e-mail
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
