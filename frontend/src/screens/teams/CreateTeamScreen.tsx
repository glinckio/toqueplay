import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { teamsService } from "@/services/teamsService";
import { getErrorMessage } from "@/services/api";
import { useTC } from "../tournaments/_tournamentKit";

type FormatOption = "Dupla" | "Quarteto" | "Sexteto";
type SurfaceOption = "Areia" | "Quadra";

const FORMATS_BY_SURFACE: Record<SurfaceOption, FormatOption[]> = {
  Areia: ["Dupla", "Quarteto"],
  Quadra: ["Sexteto"],
};

function BackButton({ onPress }: { onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name="back" size={19} color={TC.tx2} strokeWidth={2.2} />
    </Pressable>
  );
}

export function CreateTeamScreen({ navigation, route }: any) {
  const TC = useTC();
  const teamId = route?.params?.teamId as string | undefined;
  const isEditing = !!teamId;

  const [name, setName] = useState("");
  const [format, setFormat] = useState<FormatOption>("Dupla");
  const [surface, setSurface] = useState<SurfaceOption>("Areia");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(isEditing);

  useEffect(() => {
    if (!teamId) return;
    teamsService.findOne(teamId).then((team) => {
      setName(team.name);
      const desc = team.description ?? "";
      if (desc.includes("Sexteto")) setFormat("Sexteto");
      else if (desc.includes("Quarteto")) setFormat("Quarteto");
      if (desc.includes("Quadra")) setSurface("Quadra");
      if (team.avatarUrl) setLogoUri(team.avatarUrl);
    }).catch(() => {}).finally(() => setLoadingTeam(false));
  }, [teamId]);

  useEffect(() => {
    const allowed = FORMATS_BY_SURFACE[surface];
    if (!allowed.includes(format)) setFormat(allowed[0]);
  }, [surface]);

  const canCreate = name.trim().length > 0 && !submitting;

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoChanged(true);
    }
  };

  const handleSubmit = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      const params = {
        name: name.trim(),
        description: `${format} · ${surface}`,
      };
      let targetId = teamId;
      if (isEditing) {
        await teamsService.update(teamId, params);
      } else {
        const created = await teamsService.create(params);
        targetId = created.id;
      }
      if (logoChanged && logoUri && targetId) {
        const formData = new FormData();
        formData.append("file", { uri: logoUri, name: "logo.jpg", type: "image/jpeg" } as any);
        await teamsService.uploadAvatar(targetId, formData);
      }
      if (isEditing) {
        navigation?.goBack();
      } else {
        navigation?.replace("TeamDetail", { id: targetId });
      }
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, isEditing ? "Não foi possível salvar o time." : "Não foi possível criar o time."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTeam) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={TC.lime} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <BackButton onPress={() => navigation?.goBack()} />
              <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {isEditing ? "Editar time" : "Criar time"}
              </Text>
            </View>

            {/* Avatar picker — framed dashed, lime (dark) / purple (light) accent */}
            <Pressable onPress={handlePickLogo} style={{ alignItems: "center", marginBottom: 28 }} accessibilityRole="button" accessibilityLabel={logoUri ? "Alterar logo" : "Adicionar logo"}>
              {logoUri ? (
                <View style={{ width: 84, height: 84, borderRadius: 24, borderWidth: 2, borderColor: TC.isDark ? TC.lime : TC.purple, overflow: "hidden" }}>
                  <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
                </View>
              ) : (
                <View style={{
                  width: 84, height: 84, borderRadius: 24,
                  backgroundColor: TC.card,
                  borderWidth: 2, borderStyle: "dashed",
                  borderColor: TC.isDark ? "rgba(198,248,42,0.4)" : "rgba(124,58,237,0.4)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={TC.isDark ? TC.lime : TC.purple} strokeWidth={2}>
                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <Circle cx={12} cy={13} r={4} />
                  </Svg>
                </View>
              )}
              <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 10 }}>
                {logoUri ? "Alterar logo" : "Adicionar logo"}
              </Text>
            </Pressable>

            {/* Form */}
            <View style={{ gap: 18 }}>
              {/* Name */}
              <View>
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8 }}>
                  Nome do time
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ex: Beach Warriors"
                  placeholderTextColor={TC.tx3}
                  style={{
                    backgroundColor: TC.card,
                    borderWidth: 1.5,
                    borderColor: focusedField === "name" ? TC.lime : TC.cardBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: TC.tx, fontFamily: "Manrope_500Medium", fontSize: 14,
                  }}
                  accessibilityLabel="Nome do time"
                />
              </View>

              {/* Surface (Areia/Quadra) — renamed to "Formato", now on top */}
              <View>
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8 }}>
                  Formato
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
                          backgroundColor: isActive ? (TC.isDark ? TC.purple : "#C6F82A") : TC.card,
                          borderWidth: isActive ? 0 : 1,
                          borderColor: TC.cardBorder,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{
                          color: isActive ? TC.tx : TC.tx2,
                          fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase",
                        }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Format (Dupla/Quarteto/Sexteto) — "Modalidade", now at the bottom */}
              <View>
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8 }}>
                  Modalidade
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {FORMATS_BY_SURFACE[surface].map((opt) => {
                    const isActive = format === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setFormat(opt)}
                        accessibilityRole="button"
                        accessibilityLabel={opt}
                        style={{
                          flex: 1, paddingVertical: 14, borderRadius: 14,
                          backgroundColor: isActive ? (TC.isDark ? TC.purple : "#C6F82A") : TC.card,
                          borderWidth: isActive ? 0 : 1,
                          borderColor: TC.cardBorder,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{
                          color: isActive ? TC.tx : TC.tx2,
                          fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase",
                        }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* CTA — end of scroll, notched */}
            <View style={{ marginTop: 32 }}>
              <Pressable
                onPress={handleSubmit}
                disabled={!canCreate}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? "Salvar time" : "Criar time"}
                style={{ position: "relative" }}
              >
                <View style={{ backgroundColor: TC.purple, borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: canCreate ? 1 : 0.4 }}>
                  {submitting ? (
                    <ActivityIndicator size="small" color={TC.tx} />
                  ) : (
                    <>
                      <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.4, textTransform: "uppercase" }}>
                        {isEditing ? "Salvar alterações" : "Criar time"}
                      </Text>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.tx} strokeWidth={2.6}>
                        <Path d="M5 12h14M13 6l6 6-6 6" />
                      </Svg>
                    </>
                  )}
                </View>
                <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
                <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
