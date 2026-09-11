import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/ui/Icon";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { getErrorCode, getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { AuthStackParamList } from "@/navigation/types";
import { useAC, Field, NotchedButton } from "./_authKit";

// Full-bleed portrait athlete photo (preview). Swap for a curated cutout asset later.
const HERO_IMAGE = "https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=900&q=80";

const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = Math.round(SCREEN_H * 0.56);

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const AC = useAC();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setVisitorActive = useAuthStore((s) => s.setVisitorActive);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError("Preencha email e senha");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authService.login(email.trim(), password);
      if (authService.isTwoFactorRequired(result)) {
        navigation.navigate("TwoFactor", { temporaryToken: result.temporaryToken });
      } else {
        setAuth({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            ...result.user,
            role: (result.user.role as any) ?? "ATLETA",
            twoFactorEnabled: false,
          },
        });
      }
    } catch (err: any) {
      // Quem se cadastrou e fechou o app antes de confirmar cai aqui. Em vez de barrar com um
      // erro sem saida, leva direto para a verificacao, que ja reenvia o codigo.
      if (getErrorCode(err) === "EMAIL_NOT_VERIFIED") {
        navigation.navigate("VerifyEmail", { email: email.trim(), autoResend: true });
        return;
      }
      setError(getErrorMessage(err, "Erro ao fazer login"));
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation, setAuth]);

  const handleVisitor = useCallback(() => {
    setVisitorActive(true);
  }, [setVisitorActive]);

  return (
    <View style={{ flex: 1, backgroundColor: AC.bg }}>
      <StatusBar barStyle={AC.isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" bounces={false}>

          {/* ===== FULL-BLEED HERO ===== */}
          <View style={{ height: HERO_H, position: "relative" }}>
            {/* ghost wordmark behind the subject */}
            <Text
              numberOfLines={1}
              style={{
                position: "absolute", top: HERO_H * 0.1, left: -6, right: -6, textAlign: "center",
                fontFamily: "Anton_400Regular", fontSize: HERO_H * 0.2, lineHeight: HERO_H * 0.2,
                letterSpacing: 1, color: "rgba(255,255,255,0.05)",
              }}
            >
              TOQUEPLAY
            </Text>

            <Image source={{ uri: HERO_IMAGE }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: HERO_H }} contentFit="cover" cachePolicy="memory-disk" />
            {/* purple wash */}
            <LinearGradient
              colors={["rgba(124,58,237,0.45)", "rgba(124,58,237,0.06)", "transparent"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.5 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: HERO_H }}
            />
            {/* fade to black */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)", "#000000"]}
              locations={[0.3, 0.62, 0.85, 1]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: HERO_H }}
            />

            {/* brand chip top-left */}
            <View style={{ position: "absolute", top: 52, left: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Image source={require("@/../assets/logo.png")} style={{ width: 22, height: 22 }} contentFit="contain" cachePolicy="memory-disk" />
              </View>
              <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>ToquePlay</Text>
            </View>

            {/* giant headline at the seam */}
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 18 }}>
              <Text style={{ fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: AC.lime, marginBottom: 6 }}>
                Bem-vindo de volta
              </Text>
              <Text style={{ fontFamily: "Anton_400Regular", fontSize: 52, lineHeight: 50, letterSpacing: 0.5, color: AC.tx, textTransform: "uppercase" }}>
                Entre
              </Text>
              <Text style={{ fontFamily: "Anton_400Regular", fontSize: 52, lineHeight: 50, letterSpacing: 0.5, color: AC.tx, textTransform: "uppercase" }}>
                em <Text style={{ color: AC.lime }}>quadra</Text>
              </Text>
            </View>
          </View>

          {/* ===== FORM ===== */}
          <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
            {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

            <Field label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail" />
            <View style={{ height: 14 }} />
            <Field label="Senha" placeholder="••••••" value={password} onChangeText={setPassword} secureTextEntry leftIcon="lock" />

            {/* Remember + Forgot */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 20 }}>
              <Pressable onPress={() => setRememberMe(!rememberMe)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: rememberMe ? AC.lime : "transparent", borderWidth: rememberMe ? 0 : 2, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
                  {rememberMe && <Icon name="check" size={12} color={AC.limeInk} strokeWidth={3.2} />}
                </View>
                <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13 }}>Lembrar de mim</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={{ color: AC.link, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>Esqueci a senha</Text>
              </Pressable>
            </View>

            {/* ===== NOTCHED PURPLE CTA (signature motif) ===== */}
            <NotchedButton label={loading ? "Entrando..." : "Entrar"} onPress={handleLogin} loading={loading} withArrow />

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
              <Text style={{ color: AC.tx3, fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>ou continue com</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
            </View>

            {/* Social */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: AC.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 14, borderRadius: 14 }}>
                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#4285F4", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>G</Text>
                </View>
                <Text style={{ color: AC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>Google</Text>
              </Pressable>
              <Pressable style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: AC.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 14, borderRadius: 14 }}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill={AC.tx}>
                  <Path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.9zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
                </Svg>
                <Text style={{ color: AC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>Apple</Text>
              </Pressable>
            </View>

            {/* Register link */}
            <View style={{ alignItems: "center", marginTop: 22 }}>
              <Text style={{ color: AC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                Não tem conta?{" "}
                <Text onPress={() => navigation.navigate("Register")} style={{ color: AC.link, fontFamily: "Manrope_700Bold" }}>Cadastre-se</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
