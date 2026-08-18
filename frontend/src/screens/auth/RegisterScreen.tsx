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
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { AuthStackParamList } from "@/navigation/types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1749960695051-e103bd0825f9?fm=jpg&w=820&q=75&auto=format&fit=crop";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function unformatCPF(value: string): string {
  return value.replace(/\D/g, "");
}

export function RegisterScreen({ navigation }: Props) {
  const { isDark } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Mínimo 2 caracteres";
    if (!email.trim().includes("@")) errors.email = "Email inválido";
    if (unformatCPF(cpf).length !== 11) errors.cpf = "CPF inválido";
    if (password.length < 6) errors.password = "Mín. 6 caracteres";
    if (!consent) errors.consent = "É preciso aceitar os Termos de Uso e a Política de Privacidade.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, cpf, password, consent]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;
    setError("");
    setLoading(true);
    try {
      await authService.register({
        name: name.trim(),
        email: email.trim(),
        cpf: unformatCPF(cpf),
        password,
        confirmPassword: password,
        consent,
      });
      navigation.navigate("VerifyEmail", { email: email.trim() });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }, [name, email, cpf, password, consent, navigation, validate]);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0E0B14" : "#F6F4FC" }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Hero — 184px */}
          <View style={{ height: 184, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden" }}>
            <Image source={{ uri: HERO_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
            <LinearGradient
              colors={["rgba(6,4,12,0.5)", "rgba(6,4,12,0.04)", "rgba(6,4,12,0.12)", "rgba(6,4,12,0.82)"]}
              locations={[0, 0.3, 0.52, 1]}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            <View style={{ position: "absolute", left: 22, right: 22, bottom: 22, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Image source={require("@/../assets/logo.png")} style={{ width: 28, height: 28 }} resizeMode="contain" />
              </View>
              <View>
                <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", lineHeight: 24, letterSpacing: -0.01 * 24 }}>
                  Criar conta
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 3 }}>
                  Entre pra quadra em minutos
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
            {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

            <Input label="Nome completo" placeholder="Seu nome" value={name} onChangeText={setName} leftIcon="user" error={fieldErrors.name} />
            <View style={{ height: 13 }} />
            <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail" error={fieldErrors.email} />
            <View style={{ height: 13 }} />

            {/* CPF + Senha side by side */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={(t) => setCpf(formatCPF(t))} keyboardType="numeric" error={fieldErrors.cpf} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Senha" placeholder="••••••" value={password} onChangeText={setPassword} secureTextEntry error={fieldErrors.password} />
              </View>
            </View>

            {/* Consent checkbox */}
            <Pressable
              onPress={() => setConsent(!consent)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 9,
                marginTop: 16,
                marginBottom: 18,
                ...(fieldErrors.consent && !consent ? { backgroundColor: "rgba(255,77,94,0.1)", borderWidth: 1, borderColor: "rgba(255,77,94,0.35)", borderRadius: 12, padding: 11 } : {}),
              }}
            >
              <View
                style={{
                  width: 18, height: 18, borderRadius: 6,
                  backgroundColor: consent ? accentColor : "transparent",
                  borderWidth: consent ? 0 : 2,
                  borderColor: fieldErrors.consent && !consent ? "#FF4D5E" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(26,16,48,0.1)"),
                  alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}
              >
                {consent && <Icon name="check" size={12} color={isDark ? "#12100A" : "#fff"} strokeWidth={3.2} />}
              </View>
              <Text style={{ color: fieldErrors.consent && !consent ? "#FF9CA6" : (isDark ? "#A9A2BC" : "#6B6480"), fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", lineHeight: 18, flex: 1 }}>
                {fieldErrors.consent && !consent
                  ? "É preciso aceitar os Termos de Uso e a Política de Privacidade."
                  : <>Li e aceito os <Text style={{ color: accentColor, fontWeight: "700" }}>Termos de Uso</Text> e a <Text style={{ color: accentColor, fontWeight: "700" }}>Política de Privacidade</Text>.</>
                }
              </Text>
            </Pressable>

            {/* Register button */}
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: accentColor,
                paddingVertical: 15, borderRadius: 16, alignItems: "center",
                opacity: loading ? 0.7 : 1,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
                CRIAR CONTA
              </Text>
            </Pressable>

            <View style={{ alignItems: "center", marginTop: 16, marginBottom: 30 }}>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
                Já tem conta?{" "}
                <Text onPress={() => navigation.navigate("Login")} style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontWeight: "700" }}>Entrar</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
