import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { teamsService } from "@/services/teamsService";
import { friendliesService } from "@/services/friendliesService";

type ModalityOption = "Areia" | "Quadra";
type FormatOption = "Dupla" | "Quarteto" | "Sexteto";

export function CreateFriendlyScreen({ navigation }: any) {
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
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const avatarBg = isDark ? "#221B33" : "#F0ECFA";
  const avatarText = isDark ? "#CFC8E0" : "#7C3AED";

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [modality, setModality] = useState<ModalityOption>("Areia");
  const [format, setFormat] = useState<FormatOption>("Dupla");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: myTeams, loading: loadingTeams } = useApi(() => teamsService.list(), []);

  const teams = (myTeams ?? []).map(t => ({
    id: t.id,
    name: t.name,
    initials: t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
  }));

  const canCreate = selectedTeam && date.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      // Parse DD/MM/AAAA to ISO date
      let isoDate = date;
      const parts = date.split("/");
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      await friendliesService.create({
        requesterTeamId: selectedTeam!,
        date: isoDate,
        startTime: time || undefined,
        address: address || undefined,
        city: city || undefined,
        modality: modality === "Areia" ? "BEACH" : "INDOOR",
        categoryFormat: format,
      });
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message || "Erro ao criar amistoso");
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
                Criar amistoso
              </Text>
            </View>

            {/* Select team */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 8 }}>
              SEU TIME
            </Text>
            {loadingTeams ? (
              <View style={{ alignItems: "center", paddingVertical: 20, marginBottom: 20 }}>
                <ActivityIndicator size="small" color={accentColor} />
              </View>
            ) : (
              <View style={{ gap: 8, marginBottom: 20 }}>
                {teams.map((team) => {
                  const isSelected = selectedTeam === team.id;
                  return (
                    <Pressable
                      key={team.id}
                      onPress={() => setSelectedTeam(team.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar ${team.name}`}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        backgroundColor: isSelected ? (isDark ? "rgba(198,248,42,.08)" : "rgba(124,58,237,.06)") : cardBg,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? accentColor : cardBorder,
                        borderRadius: 14, padding: 12, paddingHorizontal: 14,
                      }}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 13,
                        backgroundColor: avatarBg,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
                          {team.initials}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: titleColor, fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700" }}>
                        {team.name}
                      </Text>
                      {isSelected && (
                        <View style={{
                          width: 22, height: 22, borderRadius: 11,
                          backgroundColor: accentColor,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon name="check" size={13} color={isDark ? "#12100A" : "#fff"} strokeWidth={2.6} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Opponent search */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
              ADVERSÁRIO
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: inputBg, borderWidth: 1,
              borderColor: focusedField === "opponent" ? "#8B5CF6" : inputBorder,
              borderRadius: 14, padding: 12, paddingHorizontal: 14, marginBottom: 20,
            }}>
              <Icon name="search" size={18} color={labelColor} strokeWidth={2} />
              <TextInput
                value={opponentSearch}
                onChangeText={setOpponentSearch}
                onFocus={() => setFocusedField("opponent")}
                onBlur={() => setFocusedField(null)}
                placeholder="Buscar time ou @usuário"
                placeholderTextColor={placeholderColor}
                style={{ flex: 1, color: inputText, fontFamily: "Manrope_500Medium", fontSize: 13 }}
                accessibilityLabel="Buscar adversário"
              />
            </View>

            {/* Form fields */}
            <View style={{ gap: 16 }}>
              {/* Date */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  DATA
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      onFocus={() => setFocusedField("date")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={placeholderColor}
                      style={{
                        backgroundColor: inputBg,
                        borderWidth: focusedField === "date" ? 1.5 : 1,
                        borderColor: focusedField === "date" ? "#8B5CF6" : inputBorder,
                        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                        color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                      }}
                      accessibilityLabel="Data do amistoso"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={time}
                      onChangeText={setTime}
                      onFocus={() => setFocusedField("time")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="HH:MM"
                      placeholderTextColor={placeholderColor}
                      style={{
                        backgroundColor: inputBg,
                        borderWidth: focusedField === "time" ? 1.5 : 1,
                        borderColor: focusedField === "time" ? "#8B5CF6" : inputBorder,
                        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                        color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                      }}
                      accessibilityLabel="Horário do amistoso"
                    />
                  </View>
                </View>
              </View>

              {/* Address + City */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  LOCAL
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  onFocus={() => setFocusedField("address")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Endereço (opcional)"
                  placeholderTextColor={placeholderColor}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "address" ? 1.5 : 1,
                    borderColor: focusedField === "address" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                    marginBottom: 8,
                  }}
                  accessibilityLabel="Endereço"
                />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  onFocus={() => setFocusedField("city")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Cidade (opcional)"
                  placeholderTextColor={placeholderColor}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "city" ? 1.5 : 1,
                    borderColor: focusedField === "city" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                  }}
                  accessibilityLabel="Cidade"
                />
              </View>

              {/* Modality */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  MODALIDADE
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(["Areia", "Quadra"] as ModalityOption[]).map((opt) => {
                    const isActive = modality === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setModality(opt)}
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

              {/* Format */}
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>
                  FORMATO
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(["Dupla", "Quarteto", "Sexteto"] as FormatOption[]).map((opt) => {
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
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <LinearGradient
          colors={isDark ? ["rgba(12,10,18,0)", "#0C0A12"] : ["rgba(247,245,252,0)", "#F7F5FC"]}
          locations={[0, 0.32]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 26 }}
        >
          <View style={{ opacity: (canCreate && !submitting) ? 1 : 0.25 }}>
            <Pressable
              onPress={handleCreate}
              disabled={!canCreate || submitting}
              accessibilityRole="button"
              accessibilityLabel="Enviar convite"
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
                <>
                  <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", letterSpacing: 0.02 * 15 }}>
                    Enviar convite
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
                    <Path d="m9 6 6 6-6 6" />
                  </Svg>
                </>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
