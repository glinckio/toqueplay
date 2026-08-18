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
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { AuthStackParamList } from "@/navigation/types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=820&q=75&auto=format&fit=crop";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { isDark, colors, brand } = useTheme();
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
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation, setAuth]);

  const handleVisitor = useCallback(() => {
    setVisitorActive(true);
  }, [setVisitorActive]);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const mutedLink = isDark ? "#8B5CF6" : "#7C3AED";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0E0B14" : "#F6F4FC" }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Hero Section */}
          <View style={{ height: 300, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden" }}>
            <Image
              source={{ uri: HERO_IMAGE }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(6,4,12,0.5)", "rgba(6,4,12,0.04)", "rgba(6,4,12,0.12)", "rgba(6,4,12,0.82)"]}
              locations={[0, 0.3, 0.52, 1]}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            {/* Logo */}
            <View style={{ position: "absolute", top: 50, left: 22, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Image source={require("@/../assets/logo.png")} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </View>
              <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>ToquePlay</Text>
            </View>
            {/* Title */}
            <View style={{ position: "absolute", left: 22, right: 22, bottom: 34 }}>
              <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 32, fontWeight: "700", lineHeight: 33, letterSpacing: -0.02 * 32 }}>
                {"Bem-vindo\nde volta"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", marginTop: 8, maxWidth: 260 }}>
                Entre para acompanhar seus jogos, torneios e times.
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
            {!!error && (
              <Banner variant="error" message={error} style={{ marginBottom: 18 }} />
            )}

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
            />

            <View style={{ height: 16 }} />

            <Input
              label="Senha"
              placeholder="••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock"
            />

            {/* Remember + Forgot */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 22 }}>
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    backgroundColor: rememberMe ? accentColor : "transparent",
                    borderWidth: rememberMe ? 0 : 2,
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(26,16,48,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {rememberMe && (
                    <Icon name="check" size={12} color={isDark ? "#12100A" : "#fff"} strokeWidth={3.2} />
                  )}
                </View>
                <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
                  Lembrar de mim
                </Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={{ color: mutedLink, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>
                  Esqueci a senha
                </Text>
              </Pressable>
            </View>

            {/* Enter button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: accentColor,
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
                {loading ? "ENTRANDO..." : "ENTRAR"}
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.12)" }} />
              <Text style={{ color: isDark ? "#6E6684" : "#A29CB4", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>
                ou continue com
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.12)" }} />
            </View>

            {/* Social Login */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  backgroundColor: isDark ? "#171221" : "#fff",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.1)",
                  paddingVertical: 13,
                  borderRadius: 14,
                  ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
                }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isDark ? "#fff" : "#F0ECFA", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#4285F4", fontFamily: "SpaceGrotesk_800ExtraBold", fontSize: 13, fontWeight: "800" }}>G</Text>
                </View>
                <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Google</Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  backgroundColor: isDark ? "#171221" : "#fff",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.1)",
                  paddingVertical: 13,
                  borderRadius: 14,
                  ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
                }}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill={isDark ? "#F5F3FA" : "#1A1428"}>
                  <Path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.9zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
                </Svg>
                <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Apple</Text>
              </Pressable>
            </View>

            {/* Register link */}
            <View style={{ alignItems: "center", marginTop: 18 }}>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
                Não tem conta?{" "}
                <Text
                  onPress={() => navigation.navigate("Register")}
                  style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontWeight: "700" }}
                >
                  Cadastre-se
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
