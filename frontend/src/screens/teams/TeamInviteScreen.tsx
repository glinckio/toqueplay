import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";

interface InviteMember {
  id: string;
  name: string;
  initials: string;
  isCaptain: boolean;
  colorBg: string;
  colorText: string;
  isGradient?: boolean;
}

const MOCK_MEMBERS: InviteMember[] = [
  { id: "m1", name: "Marcos Silva", initials: "MS", isCaptain: true, colorBg: "", colorText: "#fff", isGradient: true },
  { id: "m2", name: "Ana Costa", initials: "AC", isCaptain: false, colorBg: "#4A1942", colorText: "#F472B6" },
  { id: "m3", name: "João Ferreira", initials: "JF", isCaptain: false, colorBg: "#1C4A3D", colorText: "#34D399" },
];

type Step = "invite" | "success";

export function TeamInviteScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<Step>("invite");

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F6F4FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1030";
  const metaColor = isDark ? "#948CA8" : "#6B6480";
  const labelColor = isDark ? "#6E6684" : "#8A829E";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";

  const teamName = route?.params?.teamName ?? "Beach Titans";
  const teamInitials = route?.params?.teamInitials ?? "BT";
  const inviterName = route?.params?.inviterName ?? "Marcos Silva";

  const handleAccept = () => setStep("success");
  const handleReject = () => navigation?.goBack();

  // ============ SUCCESS ============
  if (step === "success") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          {/* Success circle */}
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: isDark ? "rgba(198,248,42,.1)" : "rgba(124,58,237,.08)",
            alignItems: "center", justifyContent: "center", marginBottom: 28,
            shadowColor: isDark ? "rgba(198,248,42,.2)" : "rgba(124,58,237,.15)",
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 60, elevation: 4,
          }}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={2.5}>
              <Path d="m5 12 5 5 9-11" />
            </Svg>
          </View>

          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24, textAlign: "center" }}>
            Você entrou no time!
          </Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_400Regular", fontSize: 14, fontWeight: "400", lineHeight: 22, marginTop: 10, textAlign: "center" }}>
            Agora você é membro do{" "}
            <Text style={{ color: accentColor, fontWeight: "600" }}>{teamName}</Text>
          </Text>

          {/* Mini team card */}
          <View style={{
            backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
            borderRadius: 20, padding: 18, marginTop: 28, width: "100%",
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 16,
                backgroundColor: isDark ? "#2D1B69" : "#E8DEFF",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: isDark ? "#C6F82A" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700" }}>{teamInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 15, fontWeight: "600" }}>{teamName}</Text>
                <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 2 }}>4 membros</Text>
              </View>
              <View style={{
                paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: isDark ? "rgba(198,248,42,.1)" : "rgba(124,58,237,.08)",
              }}>
                <Text style={{ color: isDark ? "#C6F82A" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>MEMBRO</Text>
              </View>
            </View>
          </View>

          {/* CTAs */}
          <Pressable
            onPress={() => navigation?.navigate("TeamDetail", { id: route?.params?.teamId ?? "" })}
            accessibilityRole="button"
            accessibilityLabel="Ver meu time"
            style={{
              width: "100%", paddingVertical: 16, borderRadius: 16, marginTop: 28,
              backgroundColor: accentColor,
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 24, elevation: 6 }),
            }}
          >
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
              VER MEU TIME
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation?.navigate("MainTabs")}
            accessibilityRole="button"
            accessibilityLabel="Voltar à home"
            style={{
              width: "100%", paddingVertical: 16, borderRadius: 16, marginTop: 10,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
              backgroundColor: "transparent",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: metaColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
              VOLTAR À HOME
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ============ INVITE VIEW ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Pressable
            onPress={() => navigation?.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "#171320" : "#FFFFFF",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700", letterSpacing: -0.02 * 20 }}>
            Convite de time
          </Text>
        </View>

        {/* Envelope icon */}
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: isDark ? "rgba(139,92,246,.1)" : "rgba(124,58,237,.08)",
          alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24,
        }}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={1.5}>
            <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
            <Circle cx={9} cy={7} r={4} />
            <Path d="M22 21v-2a4 4 0 00-3-3.87" />
            <Path d="M16 3.13a4 4 0 010 7.75" />
          </Svg>
        </View>

        <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22, textAlign: "center" }}>
          Você foi convidado!
        </Text>
        <Text style={{ color: metaColor, fontFamily: "Manrope_400Regular", fontSize: 13.5, fontWeight: "400", lineHeight: 22, marginTop: 8, textAlign: "center" }}>
          <Text style={{ color: accentColor, fontWeight: "600" }}>{inviterName}</Text>
          {" "}convidou você para entrar no time
        </Text>

        {/* Team card */}
        <View style={{
          backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
          borderRadius: 22, padding: 20, marginTop: 24,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: isDark ? "#2D1B69" : "#E8DEFF",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: isDark ? "#C6F82A" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>
                {teamInitials}
              </Text>
            </View>
            <View>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" }}>{teamName}</Text>
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 3 }}>Criado em Jun 2026</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)", marginBottom: 16 }} />

          <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 10 }}>MEMBROS ATUAIS</Text>
          <View style={{ gap: 10 }}>
            {MOCK_MEMBERS.map((m) => (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {m.isGradient ? (
                  <LinearGradient
                    colors={isDark ? ["#8B5CF6", "#C6F82A"] : ["#7C3AED", "#C6F82A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700" }}>{m.initials}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{
                    width: 34, height: 34, borderRadius: 11,
                    backgroundColor: isDark ? m.colorBg : (m.colorBg === "#4A1942" ? "#FCE7F3" : "#D1FAE5"),
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{
                      color: isDark ? m.colorText : (m.colorText === "#F472B6" ? "#DB2777" : "#059669"),
                      fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700",
                    }}>{m.initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>{m.name}</Text>
                </View>
                {m.isCaptain && (
                  <View style={{
                    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6,
                    backgroundColor: isDark ? "rgba(198,248,42,.1)" : "rgba(124,58,237,.08)",
                  }}>
                    <Text style={{
                      color: isDark ? "#C6F82A" : "#7C3AED",
                      fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700",
                    }}>CAPITÃO</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          <Pressable
            onPress={handleReject}
            accessibilityRole="button"
            accessibilityLabel="Recusar convite"
            style={{
              flex: 1, paddingVertical: 16, borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "rgba(239,68,68,.25)" : "rgba(239,68,68,.2)",
              backgroundColor: isDark ? "rgba(239,68,68,.06)" : "rgba(239,68,68,.05)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: isDark ? "#FF6B79" : "#EF4444", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>RECUSAR</Text>
          </Pressable>
          <Pressable
            onPress={handleAccept}
            accessibilityRole="button"
            accessibilityLabel="Aceitar convite"
            style={{
              flex: 2, paddingVertical: 16, borderRadius: 16,
              backgroundColor: accentColor,
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 24, elevation: 6 }),
            }}
          >
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>ACEITAR</Text>
          </Pressable>
        </View>

        <Text style={{ color: labelColor, fontFamily: "Manrope_400Regular", fontSize: 11.5, fontWeight: "400", textAlign: "center", marginTop: 14 }}>
          O convite expira em <Text style={{ color: isDark ? "#948CA8" : "#6B6480", fontWeight: "600" }}>6 dias</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
