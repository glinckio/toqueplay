import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { teamsService } from "@/services/teamsService";
import { getErrorMessage } from "@/services/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { CelebrationScreen } from "@/components/ui/CelebrationScreen";
import { useTC } from "../tournaments/_tournamentKit";

type Step = "invite" | "success";

function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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

export function TeamInviteScreen({ navigation, route }: any) {
  const TC = useTC();
  const invitationId = route?.params?.invitationId ?? route?.params?.id ?? "";
  const [step, setStep] = useState<Step>("invite");
  const [submitting, setSubmitting] = useState(false);

  const { data: pending, loading, error, refetch } = useApi(() => teamsService.getPendingInvitations(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));
  const invite = pending?.find((i) => i.id === invitationId);

  const teamId = invite?.team.id ?? route?.params?.teamId ?? "";
  const teamName = invite?.team.name ?? route?.params?.teamName ?? "";
  const teamInitials = teamName ? initialsOf(teamName) : "?";
  const teamAvatarUrl = invite?.team.avatarUrl ?? null;
  const inviterName = invite?.inviter?.name ?? route?.params?.inviterName ?? "";
  const members = invite?.team.members ?? [];
  const expiresInDays = daysUntil(invite?.expiresAt ?? null);

  const handleAccept = async () => {
    if (!invitationId) { setStep("success"); return; }
    setSubmitting(true);
    try {
      await teamsService.acceptInvitation(invitationId);
      setStep("success");
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível aceitar o convite."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!invitationId) { navigation?.goBack(); return; }
    setSubmitting(true);
    try {
      await teamsService.rejectInvitation(invitationId);
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível recusar o convite."));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ LOADING ============
  if (loading && !pending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <Skeleton width={40} height={40} radius={14} style={{ marginBottom: 28 }} />
          <Skeleton width={80} height={80} radius={24} style={{ alignSelf: "center", marginBottom: 24 }} />
          <Skeleton height={22} radius={6} style={{ marginBottom: 12, alignSelf: "center", width: 200 }} />
          <Skeleton height={160} radius={22} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ============ NOT FOUND / EXPIRED ============
  if (!loading && (error || !invite)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
          Convite não encontrado
        </Text>
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center", maxWidth: 260, marginBottom: 20 }}>
          Este convite já foi respondido, expirou, ou não existe mais.
        </Text>
        <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button">
          <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ============ SUCCESS ============
  if (step === "success") {
    return (
      <CelebrationScreen
        overline="Convite aceito"
        title={"BEM-VINDO\nAO TIME"}
        subtitle={
          <>
            Agora você é membro do{" "}
            <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Manrope_700Bold" }}>{teamName}</Text>
          </>
        }
        ctaLabel="Ver meu time"
        onCta={() => navigation?.reset({
          index: 1,
          routes: [
            { name: "MainTabs", state: { routes: [{ name: "Profile" }] } },
            { name: "TeamDetail", params: { id: teamId } },
          ],
        })}
        secondaryLabel="Voltar à home"
        onSecondary={() => navigation?.navigate("MainTabs")}
        secondaryVariant="outline"
        accentColor={TC.isDark ? undefined : TC.purple}
        ctaTextColor={TC.isDark ? undefined : "#FFFFFF"}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, borderWidth: 2, borderColor: TC.lime, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {teamAvatarUrl ? (
              <Image source={{ uri: teamAvatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 16 }}>{teamInitials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 15 }}>{teamName}</Text>
            <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 }}>{members.length + 1} membros</Text>
          </View>
          <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: TC.limeTintBg }}>
            <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 0.6 }}>MEMBRO</Text>
          </View>
        </View>
      </CelebrationScreen>
    );
  }

  // ============ INVITE VIEW ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <BackButton onPress={() => navigation?.goBack()} />
          <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Convite de time
          </Text>
        </View>

        {/* Envelope icon */}
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: TC.purpleTintBg,
          alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24,
        }}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={TC.isDark ? TC.lime : TC.purple} strokeWidth={1.5}>
            <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
            <Circle cx={9} cy={7} r={4} />
            <Path d="M22 21v-2a4 4 0 00-3-3.87" />
            <Path d="M16 3.13a4 4 0 010 7.75" />
          </Svg>
        </View>

        <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center" }}>
          Você foi convidado!
        </Text>
        {!!inviterName && (
          <Text style={{ color: TC.tx2, fontFamily: "Manrope_400Regular", fontSize: 13.5, lineHeight: 22, marginTop: 8, textAlign: "center" }}>
            <Text style={{ color: TC.lime, fontFamily: "Manrope_700Bold" }}>{inviterName}</Text>
            {" "}convidou você para entrar no time
          </Text>
        )}

        {/* Team card */}
        <View style={{
          backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder,
          borderRadius: 22, padding: 20, marginTop: 24,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, borderWidth: 2, borderColor: TC.lime, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {teamAvatarUrl ? (
                <Image source={{ uri: teamAvatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 20 }}>
                  {teamInitials}
                </Text>
              )}
            </View>
            <View>
              <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase" }}>{teamName}</Text>
              <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 3 }}>{members.length} {members.length === 1 ? "membro" : "membros"}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: TC.cardBorder, marginBottom: 16 }} />

          <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 12 }}>Membros atuais</Text>
          <View style={{ gap: 10 }}>
            {members.map((m, i) => (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 11, overflow: "hidden",
                  borderWidth: i === 0 ? 2 : 0, borderColor: TC.lime,
                  backgroundColor: i === 0 ? TC.purpleDeep : "rgba(255,255,255,0.06)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {m.user.avatarUrl ? (
                    <Image source={{ uri: m.user.avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <Text style={{ color: i === 0 ? TC.lime : TC.tx2, fontFamily: "Oswald_700Bold", fontSize: 11 }}>{initialsOf(m.user.name)}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TC.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{m.user.name}</Text>
                </View>
                {m.isCaptain && (
                  <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: TC.limeTintBg }}>
                    <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.5 }}>CAPITÃO</Text>
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
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Recusar convite"
            style={{
              flex: 1, paddingVertical: 16, borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,77,94,0.3)",
              backgroundColor: "rgba(255,77,94,0.08)",
              alignItems: "center", justifyContent: "center",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Text style={{ color: TC.danger, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Recusar</Text>
          </Pressable>
          <Pressable
            onPress={handleAccept}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Aceitar convite"
            style={{
              flex: 2, paddingVertical: 16, borderRadius: 16,
              backgroundColor: TC.purple,
              alignItems: "center", justifyContent: "center",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={TC.tx} />
            ) : (
              <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Aceitar</Text>
            )}
          </Pressable>
        </View>

        {expiresInDays !== null && (
          <Text style={{ color: TC.tx3, fontFamily: "Manrope_400Regular", fontSize: 11.5, textAlign: "center", marginTop: 14 }}>
            O convite expira em <Text style={{ color: TC.tx2, fontFamily: "Manrope_700Bold" }}>{expiresInDays} {expiresInDays === 1 ? "dia" : "dias"}</Text>
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
