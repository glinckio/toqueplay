import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path, Rect } from "react-native-svg";
import { OTPInput } from "@/components/ui/OTPInput";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { AuthStackParamList } from "@/navigation/types";
import { useAC, Field } from "./_authKit";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const AC = useAC();
  const { email } = route.params;

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

  // Success state
  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AC.bg }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* Check icon */}
          <View style={{
            width: 88, height: 88, borderRadius: 28,
            backgroundColor: AC.limeTintBg,
            borderWidth: 1, borderColor: AC.limeTintBorder,
            alignItems: "center", justifyContent: "center", marginBottom: 26,
          }}>
            <Svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke={AC.isDark ? AC.lime : AC.purple} strokeWidth={2}>
              <Path d="M5 13l4 4L19 7" />
            </Svg>
          </View>

          <Text style={{ textAlign: "center", color: AC.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 10 }}>
            Senha redefinida
          </Text>
          <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, marginBottom: 34 }}>
            Sua senha foi alterada com sucesso.{"\n"}Faça login com a nova senha.
          </Text>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={{ width: "100%", backgroundColor: AC.purple, paddingVertical: 15, borderRadius: 16, alignItems: "center" }}
          >
            <Text style={{ color: AC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>
              Voltar para login
            </Text>
          </Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AC.bg }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
          <BackButton title="Nova senha" onPress={() => navigation.goBack()} />

          {/* Lock icon */}
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: AC.limeTintBg, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 32, marginBottom: 24 }}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={AC.isDark ? AC.lime : AC.purple} strokeWidth={1.6}>
              <Rect x={5} y={11} width={14} height={10} rx={3} />
              <Path d="M8 11V7a4 4 0 018 0v4" />
            </Svg>
          </View>

          <Text style={{ textAlign: "center", color: AC.tx, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Redefinir senha
          </Text>
          <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_400Regular", fontSize: 13.5, lineHeight: 21.6, marginTop: 10, marginBottom: 28 }}>
            Digite o código recebido por e-mail e{"\n"}escolha sua nova senha.
          </Text>

          {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

          <Text style={{ color: AC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 10 }}>
            Código de verificação
          </Text>
          <OTPInput value={code} onChange={setCode} />

          <View style={{ gap: 13, marginTop: 24 }}>
            <Field
              label="Nova senha"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon="lock"
            />
            <Field
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
              width: "100%", backgroundColor: AC.purple, paddingVertical: 15, borderRadius: 16, alignItems: "center",
              marginTop: 28, opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: AC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Text>
          </Pressable>

          {/* Back to login */}
          <Pressable onPress={() => navigation.navigate("Login")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, marginBottom: 30 }}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={AC.tx2} strokeWidth={2.2}>
              <Path d="m15 6-6 6 6 6" />
            </Svg>
            <Text style={{ color: AC.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>
              Voltar para o login
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
