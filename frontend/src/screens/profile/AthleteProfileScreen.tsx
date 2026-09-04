import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Share,
  Modal,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "@/hooks/useApi";
import { usersService } from "@/services/usersService";
import { teamsService, TeamDTO } from "@/services/teamsService";
import { Icon } from "@/components/ui/Icon";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/services/api";
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
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
    // Always white — sits on a solid purple/lime fill, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

export function AthleteProfileScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const { id } = route.params;
  const currentUser = useAuthStore((s) => s.user);

  const { data: athlete, loading, error, refetch } = useApi(() => usersService.getPublicProfile(id), [id]);
  const { data: myTeams, refetch: refetchMyTeams } = useApi(() => teamsService.list(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); refetchMyTeams({ keepData: false }); }, [refetch, refetchMyTeams]));
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [inviting, setInviting] = useState(false);

  const initials = athlete?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
  const displayLocation = athlete?.city && athlete?.state ? `${athlete.city}, ${athlete.state}` : null;
  const isOwnProfile = currentUser?.id === id;
  const invitableTeams = (myTeams ?? []).filter((t: TeamDTO) => {
    const memberIds = t.members?.map((m: any) => m.user?.id ?? m.userId) ?? [];
    return !memberIds.includes(id);
  });
  const showInviteButton = !isOwnProfile && invitableTeams.length > 0;

  const handleInvite = async (teamId: string) => {
    if (!athlete?.email) return;
    setInviting(true);
    try {
      await teamsService.addMember(teamId, { email: athlete.email });
      setShowTeamPicker(false);
      Alert.alert("Convite enviado!", `${athlete.name} foi convidado para o time.`);
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível enviar o convite."));
    } finally {
      setInviting(false);
    }
  };

  const handleShare = async () => {
    try {
      const link = `toqueplay://athlete/${id}`;
      await Share.share({ message: `Confira o perfil de ${athlete?.name} no ToquePlay!\n${link}` });
    } catch {}
  };

  if (loading && !athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={C.lime} />
      </View>
    );
  }

  if (error && !athlete) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, backgroundColor: C.purple }}>
          <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const heroImage = athlete?.avatarUrl || null;
  const bannerImage = athlete?.bannerUrl || null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ===== HERO ===== */}
        <View style={{ height: 320, position: "relative" }}>
          <LinearGradient colors={[C.purpleDeep, "#140E28", "#000000"]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} />
          {bannerImage && (
            <>
              <Image source={{ uri: bannerImage }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} contentFit="cover" cachePolicy="memory-disk" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} locations={[0.4, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }} />
            </>
          )}

          {/* header buttons */}
          <View style={{ position: "absolute", top: 50, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <Pressable onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation.replace("MainTabs")} accessibilityRole="button" accessibilityLabel="Voltar" style={heroBtn}>
              <Icon name="back" size={19} color={C.onAccent} strokeWidth={2.2} />
            </Pressable>
            <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Compartilhar" style={heroBtn}>
              <Icon name="share" size={18} color={C.onAccent} strokeWidth={2} />
            </Pressable>
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
              <Text numberOfLines={2} style={{ color: athlete?.nameColor || (C.isDark ? "#FFFFFF" : "#7C3AED"), fontFamily: "Anton_400Regular", fontSize: 30, lineHeight: 30, letterSpacing: 0.4, textTransform: "uppercase" }}>{athlete?.name}</Text>
              <Text numberOfLines={1} style={{ color: athlete?.emailColor || (C.isDark ? "#FFFFFF" : "#7C3AED"), fontFamily: "Manrope_500Medium", fontSize: 12.5, marginTop: 5 }}>
                {athlete?.username ? `@${athlete.username}` : athlete?.email}{displayLocation ? `  ·  ${displayLocation}` : ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {[
              { value: `${athlete?.stats?.tournaments ?? 0}`, label: "Torneios", feat: false },
              { value: `${athlete?.stats?.wins ?? 0}`, label: "Vitórias", feat: true },
              { value: athlete?.stats?.winRate != null ? `${athlete.stats.winRate}%` : "0%", label: "Win rate", feat: false },
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
          {athlete?.bio ? (
            <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, marginBottom: 20 }}>{athlete.bio}</Text>
          ) : null}

          {/* Contact */}
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 12 }}>Contato</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, padding: 14, marginBottom: showInviteButton ? 20 : 8 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purpleTintBg, borderWidth: 1, borderColor: C.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
              <Icon name="mail" size={17} color={C.purple} />
            </View>
            <Text style={{ flex: 1, color: athlete?.emailColor || (C.isDark ? "#FFFFFF" : "#7C3AED"), fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>{athlete?.email}</Text>
          </View>

          {/* Invite CTA — notched purple */}
          {showInviteButton && (
            <Pressable onPress={() => setShowTeamPicker(true)} accessibilityRole="button" accessibilityLabel="Convidar para time" style={{ position: "relative" }}>
              <View style={{ backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Icon name="users" size={18} color={C.onAccent} strokeWidth={2.2} />
                <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Convidar para time</Text>
              </View>
              <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
              <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Team picker modal */}
      <Modal visible={showTeamPicker} transparent animationType="slide" onRequestClose={() => setShowTeamPicker(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: C.cardBorder, paddingTop: 14, paddingBottom: 40, paddingHorizontal: 20, maxHeight: "62%" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.15)", alignSelf: "center", marginBottom: 18 }} />
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 }}>Selecionar time</Text>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 20 }}>
              Escolha para qual time deseja convidar {athlete?.name?.split(" ")[0]}
            </Text>

            {invitableTeams.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
                  Nenhum time encontrado. Crie um time primeiro.
                </Text>
                <Pressable onPress={() => { setShowTeamPicker(false); navigation?.navigate("CreateTeam"); }} style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: C.purple }}>
                  <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Criar time</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {invitableTeams.map((team: TeamDTO) => {
                  const ti = team.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Pressable key={team.id} onPress={() => handleInvite(team.id)} disabled={inviting} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, padding: 12, marginBottom: 10, opacity: inviting ? 0.6 : 1 }}>
                      <View style={{ width: 46, height: 46, borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(198,248,42,0.5)", transform: [{ rotate: "-4deg" }] }}>
                        <LinearGradient colors={["#8B5CF6", "#6D3BEA"]} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 15 }}>{ti}</Text>
                        </LinearGradient>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 15 }}>{team.name}</Text>
                        <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 1 }}>
                          {team._count?.members ?? team.members?.length ?? 0} jogadores
                        </Text>
                      </View>
                      <Icon name="plus" size={18} color={C.lime} strokeWidth={2.5} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable onPress={() => setShowTeamPicker(false)} style={{ marginTop: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center" }}>
              <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const heroBtn = {
  width: 42, height: 42, borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.4)",
  borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center" as const, justifyContent: "center" as const,
};
