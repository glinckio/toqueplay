import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { OTPInput } from "@/components/ui/OTPInput";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { AuthStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { isDark, colors } = useTheme();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = useCallback(async () => {
    if (code.length < 6) {
      setError("Código deve ter 6 dígitos");
      return;
    }
    if (newPassword.length < 6) {
      setError("Senha deve ter mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Senhas não conferem");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.resetPassword(email, code, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }, [code, newPassword, confirmPassword, email]);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const linkColor = isDark ? "#8B5CF6" : "#7C3AED";

  // Success state
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F6F4FC", paddingHorizontal: 22, paddingTop: 20 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* Check icon */}
          <View style={{
            width: 88, height: 88, borderRadius: 28,
            backgroundColor: "rgba(52,211,153,0.14)",
            borderWidth: 1, borderColor: "rgba(52,211,153,0.3)",
            alignItems: "center", justifyContent: "center", marginBottom: 26,
          }}>
            <Svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth={2}>
              <Path d="M5 13l4 4L19 7" />
            </Svg>
          </View>

          <Text style={{ textAlign: "center", color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.01 * 22, marginBottom: 10 }}>
            Senha redefinida
          </Text>
          <Text style={{ textAlign: "center", color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 20.8, marginBottom: 34 }}>
            Sua senha foi alterada com sucesso.{"\n"}Faça login com a nova senha.
          </Text>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={{
              width: "100%", backgroundColor: accentColor, paddingVertical: 15, borderRadius: 16, alignItems: "center",
              ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
            }}
          >
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
              VOLTAR PARA LOGIN
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F6F4FC" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <BackButton title="Nova senha" onPress={() => navigation.goBack()} />

          {/* Lock icon */}
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: isDark ? "rgba(139,92,246,0.1)" : "rgba(124,58,237,0.08)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 32, marginBottom: 24 }}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={1.6}>
              <Rect x={5} y={11} width={14} height={10} rx={3} />
              <Path d="M8 11V7a4 4 0 018 0v4" />
            </Svg>
          </View>

          <Text style={{ textAlign: "center", color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24 }}>
            Redefinir senha
          </Text>
          <Text style={{ textAlign: "center", color: isDark ? "#948CA8" : "#6B6480", fontFamily: "Manrope_400Regular", fontSize: 13.5, fontWeight: "400", lineHeight: 21.6, marginTop: 10, marginBottom: 28 }}>
            Digite o código recebido por e-mail e{"\n"}escolha sua nova senha.
          </Text>

          {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
            Código de verificação
          </Text>
          <OTPInput value={code} onChange={setCode} />

          <View style={{ gap: 13, marginTop: 24 }}>
            <Input
              label="Nova senha"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon="lock"
            />
            <Input
              label="Confirmar senha"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock"
            />
          </View>

          <Pressable
            onPress={handleReset}
            disabled={loading}
            style={{
              width: "100%", backgroundColor: accentColor, paddingVertical: 15, borderRadius: 16, alignItems: "center",
              marginTop: 28, opacity: loading ? 0.7 : 1,
              ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
            }}
          >
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
              {loading ? "REDEFININDO..." : "REDEFINIR SENHA"}
            </Text>
          </Pressable>

          {/* Back to login */}
          <Pressable onPress={() => navigation.navigate("Login")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, marginBottom: 30 }}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth={2.2}>
              <Path d="m15 6-6 6 6 6" />
            </Svg>
            <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>
              Voltar para o login
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
