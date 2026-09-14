import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Dimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Icon } from "@/components/ui/Icon";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/services/api";
import { AuthStackParamList } from "@/navigation/types";
import { formatCPF, unformatCPF } from "@/utils/cpf";
import { useAC, AuthHero, Field, NotchedButton } from "./_authKit";

const HERO_IMAGE = "https://images.unsplash.com/photo-1521138054413-5a47d349b7af?w=900&q=80";
const HERO_H = Math.round(Dimensions.get("window").height * 0.4);

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const AC = useAC();
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
      setError(getErrorMessage(err, "Erro ao criar conta"));
    } finally {
      setLoading(false);
    }
  }, [name, email, cpf, password, consent, navigation, validate]);

  return (
    <View style={{ flex: 1, backgroundColor: AC.bg }}>
      <StatusBar barStyle={AC.isDark ? "light-content" : "dark-content"} />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <AuthHero
            image={HERO_IMAGE}
            height={HERO_H}
            overline="Bora jogar"
            titleLines={["Criar", "conta"]}
            accentWord="conta"
            subtitle="Entre pra quadra em minutos."
            onBack={() => navigation.goBack()}
            titleSize={48}
          />

          {/* Form */}
          <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
            {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

            <Field label="Nome completo" placeholder="Seu nome" value={name} onChangeText={setName} leftIcon="user" error={fieldErrors.name} />
            <View style={{ height: 13 }} />
            <Field label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail" error={fieldErrors.email} />
            <View style={{ height: 13 }} />

            {/* CPF + Senha side by side */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={(t) => setCpf(formatCPF(t))} keyboardType="numeric" error={fieldErrors.cpf} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Senha" placeholder="••••••" value={password} onChangeText={setPassword} secureTextEntry error={fieldErrors.password} />
              </View>
            </View>

            {/* Consent checkbox */}
            <Pressable
              onPress={() => setConsent(!consent)}
              style={{
                flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 16, marginBottom: 18,
                ...(fieldErrors.consent && !consent ? { backgroundColor: "rgba(255,77,94,0.1)", borderWidth: 1, borderColor: "rgba(255,77,94,0.35)", borderRadius: 12, padding: 11 } : {}),
              }}
            >
              <View
                style={{
                  width: 18, height: 18, borderRadius: 6,
                  backgroundColor: consent ? AC.lime : "transparent",
                  borderWidth: consent ? 0 : 2,
                  borderColor: fieldErrors.consent && !consent ? AC.danger : "rgba(255,255,255,0.16)",
                  alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}
              >
                {consent && <Icon name="check" size={12} color={AC.limeInk} strokeWidth={3.2} />}
              </View>
              <Text style={{ color: fieldErrors.consent && !consent ? "#FF9CA6" : AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, lineHeight: 18, flex: 1 }}>
                {fieldErrors.consent && !consent
                  ? "É preciso aceitar os Termos de Uso e a Política de Privacidade."
                  : <>Li e aceito os <Text style={{ color: AC.lime, fontFamily: "Manrope_700Bold" }}>Termos de Uso</Text> e a <Text style={{ color: AC.lime, fontFamily: "Manrope_700Bold" }}>Política de Privacidade</Text>.</>
                }
              </Text>
            </Pressable>

            <NotchedButton label={loading ? "Criando..." : "Criar conta"} onPress={handleRegister} loading={loading} withArrow />

            <View style={{ alignItems: "center", marginTop: 18 }}>
              <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                Já tem conta?{" "}
                <Text onPress={() => navigation.navigate("Login")} style={{ color: AC.link, fontFamily: "Manrope_700Bold" }}>Entrar</Text>
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
    </View>
  );
}
