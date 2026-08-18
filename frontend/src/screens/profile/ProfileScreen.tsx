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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";

const MOCK_PROFILE = {
  name: "Lucas Costa",
  username: "@lucascosta",
  email: "lucas@email.com",
  phone: "(21) 99999-0000",
  bio: "Jogador de vôlei de praia apaixonado",
  city: "Rio de Janeiro",
  state: "RJ",
  initials: "LC",
  stats: { tournaments: 8, wins: 5, winRate: "63%", teams: 3 },
};

export function ProfileScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const dividerColor = isDark ? "rgba(255,255,255,.06)" : "rgba(26,16,48,.06)";
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(MOCK_PROFILE.name);
  const [bio, setBio] = useState(MOCK_PROFILE.bio);
  const [phone, setPhone] = useState(MOCK_PROFILE.phone);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inputBg = isDark ? "#141019" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)";
  const inputText = isDark ? "#F5F3FA" : "#1A1030";
  const placeholderColor = isDark ? "#6E6684" : "#A29CB4";

  const handleSave = () => {
    setIsEditing(false);
  };

  const menuItems = [
    { icon: "users" as const, label: "Meus times", screen: "ManageTeams" },
    { icon: "trophy" as const, label: "Meus torneios", screen: "MyTournaments" },
    { icon: "volleyball" as const, label: "Amistosos", screen: "MyFriendlies" },
    { icon: "bell" as const, label: "Notificações", screen: "Notifications" },
    { icon: "shield" as const, label: "Privacidade & LGPD", screen: "Privacy" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>
                Perfil
              </Text>
              <Pressable
                onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? "Salvar perfil" : "Editar perfil"}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
                  backgroundColor: isEditing ? accentColor : (isDark ? "#171320" : "#FFFFFF"),
                  borderWidth: isEditing ? 0 : 1,
                  borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
                  ...(isDark && !isEditing ? {} : !isEditing ? { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 } : {}),
                }}
              >
                {isEditing ? (
                  <>
                    <Icon name="check" size={14} color={isDark ? "#12100A" : "#fff"} strokeWidth={2.4} />
                    <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Salvar</Text>
                  </>
                ) : (
                  <>
                    <Icon name="edit" size={14} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2} />
                    <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>Editar</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Avatar + info */}
            <View style={{ alignItems: "center", marginBottom: 22 }}>
              <LinearGradient
                colors={["#8B5CF6", "#C6F82A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 80, height: 80, borderRadius: 24,
                  alignItems: "center", justifyContent: "center", marginBottom: 12,
                  shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 28, elevation: 6,
                }}
              >
                <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 28, fontWeight: "700" }}>
                  {MOCK_PROFILE.initials}
                </Text>
              </LinearGradient>
              {!isEditing ? (
                <>
                  <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700" }}>{MOCK_PROFILE.name}</Text>
                  <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", marginTop: 2 }}>{MOCK_PROFILE.username}</Text>
                  {MOCK_PROFILE.bio && (
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 6, textAlign: "center", paddingHorizontal: 20 }}>
                      {MOCK_PROFILE.bio}
                    </Text>
                  )}
                </>
              ) : null}
            </View>

            {/* Stats bar */}
            <View style={{
              flexDirection: "row",
              backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 18, marginBottom: 20,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
            }}>
              {[
                { value: MOCK_PROFILE.stats.tournaments, label: "Torneios" },
                { value: MOCK_PROFILE.stats.wins, label: "Vitórias" },
                { value: MOCK_PROFILE.stats.winRate, label: "Win rate" },
                { value: MOCK_PROFILE.stats.teams, label: "Times" },
              ].map((stat, i, arr) => (
                <View key={stat.label} style={{
                  flex: 1, alignItems: "center", paddingVertical: 14,
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: dividerColor,
                }}>
                  <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>{stat.value}</Text>
                  <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 9, fontWeight: "500", marginTop: 2 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Edit form */}
          {isEditing && (
            <View style={{ paddingHorizontal: 22, gap: 14, marginBottom: 20 }}>
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>NOME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "name" ? 1.5 : 1,
                    borderColor: focusedField === "name" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                  }}
                  accessibilityLabel="Nome"
                />
              </View>
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>BIO</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  onFocus={() => setFocusedField("bio")}
                  onBlur={() => setFocusedField(null)}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "bio" ? 1.5 : 1,
                    borderColor: focusedField === "bio" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                    minHeight: 80, textAlignVertical: "top",
                  }}
                  accessibilityLabel="Bio"
                />
              </View>
              <View>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", letterSpacing: 0.04 * 11, marginBottom: 6 }}>TELEFONE</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: focusedField === "phone" ? 1.5 : 1,
                    borderColor: focusedField === "phone" ? "#8B5CF6" : inputBorder,
                    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                    color: inputText, fontFamily: "Manrope_500Medium", fontSize: 14,
                  }}
                  accessibilityLabel="Telefone"
                />
              </View>
            </View>
          )}

          {/* Info cards (view mode) */}
          {!isEditing && (
            <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
              <View style={{
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 18, padding: 16,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 2 }),
              }}>
                {[
                  { icon: "mail" as const, label: "Email", value: MOCK_PROFILE.email },
                  { icon: "user" as const, label: "Telefone", value: MOCK_PROFILE.phone },
                  { icon: "location" as const, label: "Cidade", value: `${MOCK_PROFILE.city}, ${MOCK_PROFILE.state}` },
                ].map((item, i, arr) => (
                  <View key={item.label}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 11,
                        backgroundColor: infoBg,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name={item.icon} size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{item.label}</Text>
                        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600", marginTop: 1 }}>{item.value}</Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: dividerColor }} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Menu items */}
          <View style={{ paddingHorizontal: 22 }}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: 10 }}>
              MENU
            </Text>
            <View style={{ gap: 8 }}>
              {menuItems.map((item) => (
                <Pressable
                  key={item.screen}
                  onPress={() => navigation?.navigate(item.screen)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                    borderRadius: 14, padding: 14, paddingHorizontal: 16,
                    ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.15)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 11,
                    backgroundColor: infoBg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={item.icon} size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                  </View>
                  <Text style={{ flex: 1, color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
                  <Icon name="chevron-right" size={16} color={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
