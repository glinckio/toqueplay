import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Dimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { AuthStackParamList } from "@/navigation/types";
import { useAC, AuthHero, Field, NotchedButton } from "./_authKit";

const HERO_IMAGE = "https://images.unsplash.com/photo-1686753768117-bf1a808689d7?w=900&q=80";
const HERO_H = Math.round(Dimensions.get("window").height * 0.46);

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const AC = useAC();
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

  // "Enviado" state
  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: AC.bg, paddingHorizontal: 22, paddingTop: 20 }}>
        <StatusBar barStyle={AC.isDark ? "light-content" : "dark-content"} />

        <Pressable
          onPress={() => setSent(false)}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: AC.card, borderWidth: 1, borderColor: AC.cardBorder, alignItems: "center", justifyContent: "center", marginTop: 40, marginBottom: 60 }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={AC.tx} strokeWidth={2.2}>
            <Path d="m15 6-6 6 6 6" />
          </Svg>
        </Pressable>

        {/* Mail+check icon */}
        <View style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: AC.limeTintBg, borderWidth: 1, borderColor: AC.limeTintBorder, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 28 }}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={AC.isDark ? AC.lime : AC.purple} strokeWidth={2}>
            <Rect x={3} y={5} width={18} height={14} rx={3} />
            <Path d="m3 7 9 6 9-6" />
            <Path d="m15 14 2.5 2.5L22 12" />
          </Svg>
        </View>

        <Text style={{ textAlign: "center", color: AC.tx, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
          Código enviado
        </Text>
        <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, paddingHorizontal: 6, marginBottom: 34 }}>
          Enviamos um código de 6 dígitos para{"\n"}
          <Text style={{ color: AC.tx, fontFamily: "Manrope_700Bold" }}>{email}</Text>
          . Ele expira em 15 minutos.
        </Text>

        <NotchedButton label="Inserir código" withArrow onPress={() => navigation.navigate("ResetPassword", { email: email.trim() })} />

        <Text style={{ textAlign: "center", color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, marginTop: 18 }}>
          Não recebeu?{" "}
          <Text onPress={() => { setSent(false); handleSend(); }} style={{ color: AC.link, fontFamily: "Manrope_700Bold" }}>
            Reenviar
          </Text>
        </Text>
      </View>
    );
  }

  // Default state — hero + email form
  return (
    <View style={{ flex: 1, backgroundColor: AC.bg }}>
      <StatusBar barStyle={AC.isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <AuthHero
            image={HERO_IMAGE}
            height={HERO_H}
            overline="Recuperar acesso"
            titleLines={["Recuperar", "sua senha"]}
            accentWord="senha"
            onBack={() => navigation.goBack()}
            titleSize={46}
          />

          {/* Form */}
          <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
            <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.15, marginBottom: 22 }}>
              Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos para você criar uma nova senha.
            </Text>

            {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

            <Field
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={error && error !== "Informe seu email" ? undefined : (error || undefined)}
            />

            <View style={{ height: 22 }} />
            <NotchedButton label={loading ? "Enviando..." : "Enviar código"} onPress={handleSend} loading={loading} withArrow />

            {/* Back to login */}
            <Pressable onPress={() => navigation.navigate("Login")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22 }}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={AC.lime} strokeWidth={2.2}>
                <Path d="m15 6-6 6 6 6" />
              </Svg>
              <Text style={{ color: AC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
                Voltar para o login
              </Text>
            </Pressable>

            {/* Info card */}
            <View style={{ marginTop: 26, flexDirection: "row", gap: 11, backgroundColor: AC.card, borderWidth: 1, borderColor: AC.cardBorder, borderRadius: 16, padding: 14, paddingRight: 15 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={AC.lime} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                <Circle cx={12} cy={12} r={9} />
                <Path d="M12 8v5M12 16.5h.01" />
              </Svg>
              <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, lineHeight: 18, flex: 1 }}>
                O código expira em 15 minutos. Verifique também a caixa de spam.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
