import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  RefreshControl,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "@/hooks/useApi";
import { usersService } from "@/services/usersService";
import { tournamentsService, TournamentDTO } from "@/services/tournamentsService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ColorPickerButton } from "@/components/ui/ColorPickerButton";
import { getErrorMessage } from "@/services/api";
import Svg, { Path } from "react-native-svg";
import { formatDate } from "@/utils/dateFormat";
import { useTheme } from "@/hooks/useTheme";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    purpleDeep: "#2D1B69",
    lime: "#C6F82A",
    limeInk: "#12100A",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    danger: "#FF4D5E",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

export function ProfileScreen({ navigation }: any) {
  const C = useScreenColors();
  const { data: profile, loading: loadingProfile, error: errorProfile, refetch: refetchProfile } = useApi(() => usersService.getProfile(), []);
  const { data: stats, loading: loadingStats, refetch: refetchStats } = useApi(() => usersService.getMyStats(), []);
  const { data: myTournaments, loading: loadingTournaments, refetch: refetchTournaments } = useApi(() => tournamentsService.findMine(), []);
  const loading = loadingProfile || loadingStats;
  const refetch = async (opts?: { keepData?: boolean }) => {
    await Promise.all([refetchProfile(opts), refetchStats(opts), refetchTournaments(opts)]);
  };

  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, []));

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [nameColor, setNameColor] = useState<string | null>(null);
  const [emailColor, setEmailColor] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setUsername(profile.username ?? "");
      setPhone(profile.phone ?? "");
      setCity(profile.city && profile.state ? `${profile.city}, ${profile.state}` : "");
      setBio(profile.bio ?? "");
      setNameColor(profile.nameColor ?? null);
      setEmailColor(profile.emailColor ?? null);
    }
  }, [profile]);

  const initials = profile?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
  const displayLocation = profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : null;
  const heroImage = avatarUri || profile?.avatarUrl || null;
  const bannerImage = bannerUri || profile?.bannerUrl || null;

  const handleSave = async () => {
    try {
      const [cityPart, statePart] = city.includes(",") ? city.split(",").map((s) => s.trim()) : [city, ""];
      await usersService.updateProfile({
        name: name || undefined,
        username: username || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        city: cityPart || undefined,
        state: statePart || undefined,
        nameColor: nameColor ?? "",
        emailColor: emailColor ?? "",
      });
      await refetchProfile();
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Erro ao salvar perfil"));
    }
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      try {
        const formData = new FormData();
        formData.append("file", { uri, name: "avatar.jpg", type: "image/jpeg" } as any);
        const uploadResult = await usersService.uploadAvatar(formData);
        await refetchProfile();
        const currentUser = useAuthStore.getState().user;
        if (currentUser && uploadResult?.avatarUrl) {
          useAuthStore.getState().setUser({ ...currentUser, avatarUrl: uploadResult.avatarUrl });
        }
      } catch (err: any) {
        Alert.alert("Erro", getErrorMessage(err, "Erro ao enviar foto"));
      }
    }
  };

  const handlePickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setBannerUri(uri);
      setUploadingBanner(true);
      try {
        const formData = new FormData();
        formData.append("file", { uri, name: "banner.jpg", type: "image/jpeg" } as any);
        await usersService.uploadBanner(formData);
        await refetchProfile();
      } catch (err: any) {
        setBannerUri(null);
        Alert.alert("Erro", getErrorMessage(err, "Erro ao enviar banner"));
      } finally {
        setUploadingBanner(false);
      }
    }
  };

  const handleShareProfile = async () => {
    try {
      const link = `toqueplay://athlete/${profile?.id}`;
      await Share.share({ message: `Confira o perfil de ${profile?.name} no ToquePlay!\n${link}` });
    } catch {}
  };

  const handleLogout = () => setConfirmLogoutVisible(true);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try { await authService.logout(); } catch {} finally {
      setLoggingOut(false);
      setConfirmLogoutVisible(false);
      useAuthStore.getState().logout();
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Skeleton height={260} radius={20} style={{ marginBottom: 18 }} />
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
            <Skeleton height={86} radius={16} style={{ flex: 1 }} />
            <Skeleton height={86} radius={16} style={{ flex: 1 }} />
            <Skeleton height={86} radius={16} style={{ flex: 1 }} />
          </View>
          <Skeleton height={56} radius={14} style={{ marginBottom: 12 }} />
          <Skeleton height={56} radius={14} style={{ marginBottom: 12 }} />
          <Skeleton height={56} radius={14} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorProfile && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{errorProfile}</Text>
          <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: C.purple, marginBottom: 12 }}>
            <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
          </Pressable>
          <Pressable onPress={() => useAuthStore.getState().logout()} hitSlop={8}>
            <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Ir para login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── EDIT MODE ──
  if (isEditing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 14, paddingHorizontal: 20 }}>
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 24 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Pressable onPress={() => setIsEditing(false)} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="back" size={19} color={C.tx} strokeWidth={2.2} />
                  </Pressable>
                  <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.3, textTransform: "uppercase" }}>Editar perfil</Text>
                </View>
                <Pressable onPress={handleSave} accessibilityRole="button" accessibilityLabel="Salvar perfil">
                  <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Salvar</Text>
                </Pressable>
              </View>

              {/* Avatar edit */}
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <Pressable onPress={handlePickAvatar} style={{ position: "relative" }}>
                  {heroImage ? (
                    <Image source={{ uri: heroImage }} style={{ width: 96, height: 96, borderRadius: 28, borderWidth: 2, borderColor: C.purple }} />
                  ) : (
                    <LinearGradient colors={["#8B5CF6", "#6D3BEA"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontFamily: "Anton_400Regular", fontSize: 34 }}>{initials}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ position: "absolute", bottom: -4, right: -4, width: 32, height: 32, borderRadius: 11, backgroundColor: C.lime, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="camera" size={14} color={C.limeInk} strokeWidth={2.5} />
                  </View>
                </Pressable>
                <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 12 }}>Alterar foto</Text>
              </View>

              {/* Form */}
              <View style={{ gap: 16 }}>
                {renderField("Nome completo", name, setName, "name", undefined, {
                  value: nameColor, onChange: setNameColor, label: "Cor do nome", defaultColor: C.isDark ? "#FFFFFF" : "#7C3AED",
                })}
                {renderUsernameField()}
                {renderReadOnlyField("E-mail", profile?.email ?? "", {
                  value: emailColor, onChange: setEmailColor, label: "Cor do e-mail", defaultColor: C.isDark ? "#FFFFFF" : "#7C3AED",
                })}
                {renderField("Telefone", phone, setPhone, "phone", "phone-pad")}
                {renderCityField()}
                {renderBioField()}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  function fieldLabel(label: string) {
    return <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8 }}>{label}</Text>;
  }
  function inputStyle(key: string) {
    return {
      backgroundColor: C.card,
      borderWidth: 1.5,
      borderColor: focusedField === key ? C.lime : C.cardBorder,
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
      color: C.tx, fontFamily: "Manrope_500Medium" as const, fontSize: 14,
    };
  }

  function renderField(label: string, value: string, onChange: (v: string) => void, fieldKey: string, keyboard?: any, colorPicker?: { value: string | null; onChange: (v: string | null) => void; label: string; defaultColor?: string }) {
    return (
      <View>
        {fieldLabel(label)}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocusedField(fieldKey)}
            onBlur={() => setFocusedField(null)}
            keyboardType={keyboard}
            placeholderTextColor={C.tx3}
            style={[inputStyle(fieldKey), colorPicker ? { flex: 1 } : undefined]}
            accessibilityLabel={label}
          />
          {colorPicker && (
            <ColorPickerButton value={colorPicker.value} onChange={colorPicker.onChange} accessibilityLabel={colorPicker.label} defaultColor={colorPicker.defaultColor} />
          )}
        </View>
      </View>
    );
  }

  function renderUsernameField() {
    return (
      <View>
        {fieldLabel("Nome de usuário")}
        <View style={{ backgroundColor: C.card, borderWidth: 1.5, borderColor: focusedField === "username" ? C.lime : C.cardBorder, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 14 }}>@</Text>
          <TextInput value={username} onChangeText={setUsername} onFocus={() => setFocusedField("username")} onBlur={() => setFocusedField(null)} style={{ flex: 1, color: C.tx, fontFamily: "Manrope_500Medium", fontSize: 14, padding: 0 }} accessibilityLabel="Nome de usuário" />
        </View>
      </View>
    );
  }

  function renderReadOnlyField(label: string, value: string, colorPicker?: { value: string | null; onChange: (v: string | null) => void; label: string; defaultColor?: string }) {
    return (
      <View>
        {fieldLabel(label)}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14 }}>{value}</Text>
          </View>
          {colorPicker && (
            <ColorPickerButton value={colorPicker.value} onChange={colorPicker.onChange} accessibilityLabel={colorPicker.label} defaultColor={colorPicker.defaultColor} />
          )}
        </View>
      </View>
    );
  }

  function renderCityField() {
    return (
      <View>
        {fieldLabel("Cidade")}
        <View style={{ backgroundColor: C.card, borderWidth: 1.5, borderColor: focusedField === "city" ? C.lime : C.cardBorder, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TextInput value={city} onChangeText={setCity} onFocus={() => setFocusedField("city")} onBlur={() => setFocusedField(null)} style={{ flex: 1, color: C.tx, fontFamily: "Manrope_500Medium", fontSize: 14, padding: 0 }} accessibilityLabel="Cidade" />
          <Icon name="chevron-down" size={16} color={C.tx3} strokeWidth={2} />
        </View>
      </View>
    );
  }

  function renderBioField() {
    return (
      <View>
        {fieldLabel("Bio")}
        <TextInput
          value={bio}
          onChangeText={setBio}
          onFocus={() => setFocusedField("bio")}
          onBlur={() => setFocusedField(null)}
          multiline
          numberOfLines={3}
          placeholderTextColor={C.tx3}
          style={{ backgroundColor: C.card, borderWidth: 1.5, borderColor: focusedField === "bio" ? C.lime : C.cardBorder, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, color: C.tx, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19.5, minHeight: 72, textAlignVertical: "top" }}
          accessibilityLabel="Bio"
        />
      </View>
    );
  }

  // ── VIEW MODE ──
  const recentTournaments = (myTournaments ?? []).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.lime} />}>

        {/* ===== HERO ===== */}
        <View style={{ height: 320, position: "relative" }}>
          {/* branded backdrop — default purple, or the user's custom banner */}
          <LinearGradient colors={[C.purpleDeep, "#140E28", "#000000"]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} />
          {bannerImage && (
            <>
              <Image source={{ uri: bannerImage }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} contentFit="cover" cachePolicy="memory-disk" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} locations={[0.4, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} />
            </>
          )}

          {/* header buttons */}
          <View style={{ position: "absolute", top: 50, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Voltar" style={heroBtn}>
              <Icon name="back" size={19} color={C.onAccent} strokeWidth={2.2} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={handlePickBanner} disabled={uploadingBanner} accessibilityRole="button" accessibilityLabel="Alterar banner" style={heroBtn}>
                {uploadingBanner ? <ActivityIndicator size="small" color={C.onAccent} /> : <Icon name="camera" size={18} color={C.onAccent} strokeWidth={2} />}
              </Pressable>
              <Pressable onPress={handleShareProfile} accessibilityRole="button" accessibilityLabel="Compartilhar" style={heroBtn}>
                <Icon name="share" size={18} color={C.onAccent} strokeWidth={2} />
              </Pressable>
              <Pressable onPress={() => setIsEditing(true)} accessibilityRole="button" accessibilityLabel="Editar perfil" style={heroBtn}>
                <Icon name="more-vertical" size={18} color={C.onAccent} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* framed avatar + name */}
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 20, flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
            <View style={{ width: 104, height: 104, borderRadius: 22, borderWidth: 2.5, borderColor: C.lime, overflow: "hidden", transform: [{ rotate: "-4deg" }], backgroundColor: C.purpleDeep }}>
              {heroImage ? (
                <Image source={{ uri: heroImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <LinearGradient colors={["#8B5CF6", "#6D3BEA"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontFamily: "Anton_400Regular", fontSize: 38 }}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: 4 }}>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, backgroundColor: C.purple }}>
                  <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 1 }}>ATLETA</Text>
                </View>
              </View>
              <Text numberOfLines={2} style={{ color: profile?.nameColor || (C.isDark ? "#FFFFFF" : "#7C3AED"), fontFamily: "Anton_400Regular", fontSize: 30, lineHeight: 30, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {profile?.name}
              </Text>
              <Text numberOfLines={1} style={{ color: profile?.emailColor || (C.isDark ? "#FFFFFF" : "#7C3AED"), fontFamily: "Manrope_500Medium", fontSize: 12.5, marginTop: 5 }}>
                {profile?.username ? `@${profile.username}` : profile?.email}{displayLocation ? `  ·  ${displayLocation}` : ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 22 }}>
            {[
              { value: `${stats?.tournaments ?? 0}`, label: "Torneios", feat: false },
              { value: `${stats?.wins ?? 0}`, label: "Vitórias", feat: true },
              { value: stats?.winRate != null ? `${stats.winRate}%` : "0%", label: "Win rate", feat: false },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, position: "relative", backgroundColor: s.feat ? C.purple : C.card, borderWidth: s.feat ? 0 : 1, borderColor: C.cardBorder, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 8, alignItems: "center" }}>
                {s.feat && <View style={{ position: "absolute", left: -8, top: "50%", marginTop: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg }} />}
                {s.feat && <View style={{ position: "absolute", right: -8, top: "50%", marginTop: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg }} />}
                <Text style={{ color: s.feat ? C.onAccent : C.lime, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>{s.value}</Text>
                <Text style={{ color: s.feat ? "rgba(255,255,255,0.8)" : C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Bio */}
          {profile?.bio ? (
            <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, marginBottom: 20 }}>{profile.bio}</Text>
          ) : null}

          {/* Recent tournaments */}
          {recentTournaments.length > 0 && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase" }}>Torneios recentes</Text>
                <Pressable onPress={() => navigation?.navigate("MyTournaments")} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Ver todos</Text>
                </Pressable>
              </View>
              <View style={{ gap: 10, marginBottom: 22 }}>
                {recentTournaments.map((t: TournamentDTO) => {
                  const dateStr = t.date ? formatDate(t.date, { day: "numeric", month: "short" }) : "";
                  return (
                    <Pressable key={t.id} onPress={() => navigation?.navigate("TournamentDetail", { id: t.id })} accessibilityRole="button" accessibilityLabel={t.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purpleDeep, borderWidth: 1.5, borderColor: "rgba(198,248,42,0.4)", alignItems: "center", justifyContent: "center" }}>
                        <TrophyIcon size={18} color={C.lime} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{t.name}</Text>
                        <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 1 }}>{dateStr}{t.city ? ` · ${t.city}` : ""}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Quick links — grouped card with circular medallions */}
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 12 }}>Atalhos</Text>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingHorizontal: 14, marginBottom: 22 }}>
            {[
              { label: "Meus times", icon: "users" as const, route: "ManageTeams" },
              { label: "Meus torneios", icon: "trophy" as const, route: "MyTournaments" },
              { label: "Meus amistosos", icon: "volleyball" as const, route: "MyFriendlies" },
              { label: "Minhas inscrições", icon: "calendar" as const, route: "MyRegistrations" },
            ].map((item, i, arr) => (
              <Pressable key={item.route} onPress={() => navigation?.navigate(item.route)} accessibilityRole="button" accessibilityLabel={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.cardBorder }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={item.icon} size={18} color={C.purple} strokeWidth={2} />
                </View>
                <Text style={{ flex: 1, color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{item.label}</Text>
                <Icon name="chevron-right" size={16} color={C.tx3} strokeWidth={2} />
              </Pressable>
            ))}
          </View>

          {/* Definições */}
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 12 }}>Definições</Text>
          <Pressable onPress={() => navigation?.navigate("Settings")} accessibilityRole="button" accessibilityLabel="Configurações" style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 22 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
              <Icon name="settings" size={18} color={C.purple} strokeWidth={2} />
            </View>
            <Text style={{ flex: 1, color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>Configurações</Text>
            <Icon name="chevron-right" size={16} color={C.tx3} strokeWidth={2} />
          </Pressable>

          {/* Logout — danger card with medallion */}
          <Pressable onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Sair da conta" style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "rgba(255,77,94,0.06)", borderWidth: 1, borderColor: "rgba(255,77,94,0.28)", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,77,94,0.14)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="log-out" size={18} color={C.danger} strokeWidth={2} />
            </View>
            <Text style={{ flex: 1, color: C.danger, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogoutVisible}
        title="Sair da conta"
        message="Tem certeza que deseja sair?"
        cancelLabel="Cancelar"
        actionLabel="Sair"
        danger
        loading={loggingOut}
        onCancel={() => setConfirmLogoutVisible(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
}

const heroBtn = {
  width: 42, height: 42, borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.4)",
  borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center" as const, justifyContent: "center" as const,
};

function TrophyIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9V2h12v7a6 6 0 01-12 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 21h6M12 15v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
