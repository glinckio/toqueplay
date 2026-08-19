import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { teamsService } from "@/services/teamsService";

type FormatOption = "Dupla" | "Quarteto";
type SurfaceOption = "Areia" | "Quadra";

export function CreateTeamScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const inputBg = isDark ? "#141019" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)";
  const inputText = isDark ? "#F5F3FA" : "#1A1030";
  const placeholderColor = isDark ? "#6E6684" : "#A29CB4";
  const inactiveBg = isDark ? "#141019" : "#FFFFFF";
  const inactiveBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)";
  const inactiveText = isDark ? "#948CA8" : "#847B98";

  const [name, setName] = useState("");
  const [format, setFormat] = useState<FormatOption>("Dupla");
  const [surface, setSurface] = useState<SurfaceOption>("Areia");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = name.trim().length > 0 && !submitting;

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      await teamsService.create({
        name: name.trim(),
        description: `${format} · ${surface}`,
      });
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message || "Não foi possível criar o time.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
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
                  ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
                }}
              >
                <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
              </Pressable>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>
                Criar time
              </Text>
            </View>

            {/* Avatar placeholder */}
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 24,
                backgroundColor: isDark ? "#171320" : "#F0ECFA",
                borderWidth: 2, borderStyle: "dashed",
                borderColor: isDark ? "rgba(139,92,246,.4)" : "rgba(124,58,237,.3)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2}>
                  <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <Circle cx={12} cy={13} r={4} />
                </Svg>
              </View>
              <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600", marginTop: 8 }}>
                Adicionar logo
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16 }}>
              {/* Name */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  NOME DO TIME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ex: Beach Warriors"
                  placeholderTextColor={placeholderColor}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "name" ? 1.5 : 1,
                    borderColor: focusedField === "name" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                    ...(focusedField === "name" ? { shadowColor: "rgba(139,92,246,.1)", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 } : {}),
                  }}
                  accessibilityLabel="Nome do time"
                />
              </View>

              {/* Format */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  MODALIDADE
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(["Dupla", "Quarteto"] as FormatOption[]).map((opt) => {
                    const isActive = format === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setFormat(opt)}
                        accessibilityRole="button"
                        accessibilityLabel={opt}
                        style={{
                          flex: 1, paddingVertical: 14, borderRadius: 14,
                          backgroundColor: isActive ? accentColor : inactiveBg,
                          borderWidth: isActive ? 0 : 1,
                          borderColor: inactiveBorder,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{
                          color: isActive ? (isDark ? "#12100A" : "#fff") : inactiveText,
                          fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700",
                        }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Surface */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  SUPERFÍCIE
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(["Areia", "Quadra"] as SurfaceOption[]).map((opt) => {
                    const isActive = surface === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setSurface(opt)}
                        accessibilityRole="button"
                        accessibilityLabel={opt}
                        style={{
                          flex: 1, paddingVertical: 14, borderRadius: 14,
                          backgroundColor: isActive ? accentColor : inactiveBg,
                          borderWidth: isActive ? 0 : 1,
                          borderColor: inactiveBorder,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{
                          color: isActive ? (isDark ? "#12100A" : "#fff") : inactiveText,
                          fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700",
                        }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Invite section */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginTop: 24, marginBottom: 8 }}>
              CONVIDAR PARCEIRO
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
              borderRadius: 14, padding: 12, paddingHorizontal: 14, marginBottom: 14,
            }}>
              <Icon name="search" size={18} color={labelColor} strokeWidth={2} />
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
                Buscar por nome ou @usuário
              </Text>
            </View>

            {/* Share link */}
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Compartilhar link de convite" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2}>
                  <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </Svg>
                <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>
                  Ou compartilhar link de convite
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <LinearGradient
          colors={isDark ? ["rgba(12,10,18,0)", "#0C0A12"] : ["rgba(247,245,252,0)", "#F7F5FC"]}
          locations={[0, 0.32]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 26 }}
        >
          <View style={{ opacity: canCreate ? 1 : 0.25 }}>
            <Pressable
              onPress={handleCreate}
              disabled={!canCreate}
              accessibilityRole="button"
              accessibilityLabel="Criar time"
              style={{
                width: "100%", paddingVertical: 17, borderRadius: 18,
                backgroundColor: accentColor,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={isDark ? "#12100A" : "#fff"} />
              ) : (
                <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", letterSpacing: 0.02 * 15 }}>
                  Criar time
                </Text>
              )}
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
                <Path d="m9 6 6 6-6 6" />
              </Svg>
            </Pressable>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
