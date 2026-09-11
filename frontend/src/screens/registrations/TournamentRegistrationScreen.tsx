import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import {
  registrationsService,
  RegistrationDTO,
} from "@/services/registrationsService";
import { tournamentsService } from "@/services/tournamentsService";
import { teamsService } from "@/services/teamsService";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { CelebrationScreen } from "@/components/ui/CelebrationScreen";
import { TournamentType, TournamentFormat, TournamentModality } from "@/types/enums";
import { useTheme } from "@/hooks/useTheme";
import { getErrorMessage } from "@/services/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    lime: "#C6F82A",
    limeInk: "#12100A",
    warning: "#FFC14D",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

interface CategoryOption {
  id: string;
  type: TournamentType;
  format: TournamentFormat;
  modality: TournamentModality;
  price: number;
}

interface TeamOption {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  memberInitials: string[];
  memberCount: number;
  minPlayers: number;
  isOwner: boolean;
  members: { id: string; name: string; initials: string; avatarUrl: string | null; isTeamCaptain: boolean; alreadyRegistered?: boolean }[];
}

type TypeLabel = { [K in TournamentType]: string };
type FormatLabel = { [K in TournamentFormat]: string };

const TYPE_LABEL: TypeLabel = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIX: "Misto",
};

const FORMAT_LABEL: FormatLabel = {
  PAIR: "Dupla",
  QUARTET: "Quarteto",
  SEXTET: "Sexteto",
};

// Mock data — replaced by API when tournament detail + teams endpoints are wired
const MOCK_CATEGORIES: CategoryOption[] = [
  { id: "cat-1", type: TournamentType.MALE, format: TournamentFormat.PAIR, modality: TournamentModality.BEACH, price: 120 },
  { id: "cat-2", type: TournamentType.MIX, format: TournamentFormat.QUARTET, modality: TournamentModality.BEACH, price: 160 },
];

const MOCK_TEAMS: TeamOption[] = [
  {
    id: "team-1", name: "Silva & Rocha", initials: "SR", avatarUrl: null, memberCount: 2, minPlayers: 2,
    memberInitials: ["L", "R"], isOwner: true,
    members: [
      { id: "m1", name: "Lucas Menezes", initials: "L", avatarUrl: null, isTeamCaptain: true },
      { id: "m2", name: "Rafael Rocha", initials: "R", avatarUrl: null, isTeamCaptain: false },
      { id: "m3", name: "Bruno Alves", initials: "B", avatarUrl: null, isTeamCaptain: false },
      { id: "m4", name: "Tiago Nunes", initials: "T", avatarUrl: null, isTeamCaptain: false, alreadyRegistered: true },
    ],
  },
  {
    id: "team-2", name: "Praia Aces", initials: "PA", avatarUrl: null, memberCount: 3, minPlayers: 2,
    memberInitials: ["B", "M", "J"], isOwner: true,
    members: [
      { id: "p1", name: "Bruno Alves", initials: "B", avatarUrl: null, isTeamCaptain: true },
      { id: "p2", name: "Marina Dias", initials: "M", avatarUrl: null, isTeamCaptain: false },
      { id: "p3", name: "João Pedro", initials: "J", avatarUrl: null, isTeamCaptain: false },
    ],
  },
  {
    id: "team-3", name: "Furacão Team", initials: "FT", avatarUrl: null, memberCount: 1, minPlayers: 2,
    memberInitials: ["F"], isOwner: true,
    members: [{ id: "f1", name: "Felipe Souza", initials: "F", avatarUrl: null, isTeamCaptain: true }],
  },
];

type Step = 1 | 2 | 3;

export function TournamentRegistrationScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const tournamentId: string = route?.params?.tournamentId ?? "";
  const tournamentName: string = route?.params?.tournamentName ?? "Torneio";
  const tournamentLocation: string = route?.params?.tournamentLocation ?? "";

  const [step, setStep] = useState<Step>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationDTO | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: tournamentData, loading: loadingTournament, refetch: refetchTournamentData } = useApi(
    () => tournamentId ? tournamentsService.findOne(tournamentId) : Promise.resolve(null),
    [tournamentId]
  );
  const { data: userTeams, loading: loadingTeams, refetch: refetchUserTeams } = useApi(() => teamsService.list(), []);
  useFocusEffect(useCallback(() => { refetchTournamentData({ keepData: false }); refetchUserTeams({ keepData: false }); }, [refetchTournamentData, refetchUserTeams]));

  const apiCategories: CategoryOption[] = useMemo(() => {
    if (!tournamentData?.categories) return MOCK_CATEGORIES;
    return tournamentData.categories.map((c) => ({
      id: c.id,
      type: c.type,
      format: c.format,
      modality: c.modality ?? TournamentModality.BEACH,
      price: c.registrationPrice != null ? Number(c.registrationPrice) : 0,
    }));
  }, [tournamentData]);

  const apiTeams: TeamOption[] = useMemo(() => {
    if (!userTeams) return MOCK_TEAMS;
    return userTeams.map((t) => ({
      id: t.id,
      name: t.name,
      initials: t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      avatarUrl: t.avatarUrl,
      memberInitials: (t.members ?? []).slice(0, 3).map(m => m.user.name[0]),
      memberCount: t.members?.length ?? t._count?.members ?? 0,
      minPlayers: 2,
      isOwner: t.ownerId === currentUserId,
      members: (t.members ?? []).map(m => ({
        id: m.id,
        name: m.user.name,
        initials: m.user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        avatarUrl: m.user.avatarUrl,
        isTeamCaptain: m.isCaptain,
      })),
    }));
  }, [userTeams]);

  const categories = apiCategories;
  const teams = apiTeams;

  const selectedTeam = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teamId, teams]);
  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId) ?? null, [categoryId, categories]);

  const playersNeeded = selectedCategory
    ? selectedCategory.format === TournamentFormat.PAIR
      ? 2
      : selectedCategory.format === TournamentFormat.QUARTET
        ? 4
        : 6
    : 0;

  const goBack = () => {
    if (step === 2) setStep(1);
    else navigation?.goBack();
  };

  const toggleMember = (memberId: string, alreadyRegistered: boolean) => {
    if (alreadyRegistered) return;
    setSelectedMemberIds((prev) => {
      const has = prev.includes(memberId);
      if (!has && prev.length >= playersNeeded) return prev;
      if (has) {
        if (captainId === memberId) setCaptainId(null);
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const confirmRegistration = async () => {
    if (selectedMemberIds.length !== playersNeeded) return;
    const captain = captainId ?? selectedMemberIds[0];
    setSubmitting(true);
    try {
      const reg = await registrationsService.registerTeam(tournamentId || "mock", {
        teamId: teamId!,
        categoryId: categoryId!,
        memberIds: selectedMemberIds,
        captainMemberId: captain,
      });
      setResult(reg);
    } catch (err: any) {
      // getErrorMessage traduz o `code` do backend — ler data.message cru traria "Conflict
      // Exception" para o usuario final.
      setErrorModal(getErrorMessage(err, "Não foi possível concluir a inscrição."));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep(3);
  };

  // ============ STEP 3 — SUCCESS ============
  if (step === 3) {
    const price = selectedCategory?.price ?? 0;
    return (
      <RegistrationSuccess
        tournamentName={tournamentName}
        teamName={selectedTeam?.name ?? ""}
        categoryLabel={`${selectedCategory?.type === TournamentType.MALE ? "Masc" : selectedCategory?.type === TournamentType.FEMALE ? "Fem" : "Misto"} · ${FORMAT_LABEL[selectedCategory!.format]} · ${selectedCategory!.modality === TournamentModality.BEACH ? "Areia" : "Quadra"}`}
        price={price}
        onDone={() => navigation?.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
      />
    );
  }

  // ============ STEPS 1 & 2 ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: step === 1 ? 24 : 22, paddingTop: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: step === 1 ? 26 : 14 }}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={{ width: 40, height: 40, borderRadius: step === 1 ? 14 : 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="back" size={19} color={C.tx2} strokeWidth={2.2} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: step === 1 ? 22 : 20, letterSpacing: 0.3, textTransform: "uppercase" }} numberOfLines={1}>
                {step === 1 ? "Inscrever time" : "Selecionar atletas"}
              </Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }} numberOfLines={1}>
                {step === 1
                  ? `${tournamentName}${tournamentLocation ? ` · ${tournamentLocation}` : ""}`
                  : `${selectedTeam?.name} · ${selectedCategory ? FORMAT_LABEL[selectedCategory.format] : ""}`}
              </Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              {/* CATEGORIA */}
              <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
                Categoria
              </Text>
              <View style={{ flexDirection: "row", gap: 11, marginBottom: 28 }}>
                {categories.map((cat) => {
                  const isActive = cat.id === categoryId;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setCategoryId(cat.id);
                        setSelectedMemberIds([]);
                        setCaptainId(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Categoria ${TYPE_LABEL[cat.type]}`}
                      style={{ flex: 1 }}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={["#8B5CF6", "#6D3BEA"]}
                          start={{ x: 0.16, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ borderRadius: 20, padding: 16 }}
                        >
                          <CategoryCardContent cat={cat} isActive />
                        </LinearGradient>
                      ) : (
                        <View style={{ borderRadius: 20, padding: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder }}>
                          <CategoryCardContent cat={cat} isActive={false} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* SEU TIME */}
              <Text style={{ color: C.tx2, fontFamily: "Oswald_700Bold", fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
                Seu time
              </Text>
              <View style={{ gap: 12 }}>
                {teams.map((team) => {
                  const isActive = team.id === teamId;
                  const incomplete = team.memberCount < team.minPlayers;
                  const notOwner = !team.isOwner;
                  const disabled = incomplete || notOwner;
                  const cardBg = isActive ? "#1E1732" : disabled ? "#0E0D15" : C.card;
                  return (
                    <Pressable
                      key={team.id}
                      onPress={() => disabled ? undefined : setTeamId(isActive ? null : team.id)}
                      disabled={disabled}
                      style={{
                        borderRadius: 20, padding: 16,
                        backgroundColor: cardBg,
                        borderWidth: isActive ? 1.5 : 1,
                        borderColor: isActive ? "#8B5CF6" : C.cardBorder,
                        opacity: incomplete ? 0.6 : 1,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                        {team.avatarUrl ? (
                          <Image source={{ uri: team.avatarUrl }} style={{ width: 46, height: 46, borderRadius: 14 }} />
                        ) : (
                          <LinearGradient
                            colors={isActive ? ["#8B5CF6", "#6D3BEA"] : ["#221B33", "#1A1526"]}
                            style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ color: isActive ? "#fff" : C.tx2, fontFamily: "Oswald_700Bold", fontSize: 15 }}>
                              {team.initials}
                            </Text>
                          </LinearGradient>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: disabled ? C.tx2 : C.tx, fontFamily: "Manrope_700Bold", fontSize: 15, marginBottom: 6 }}>
                            {team.name}
                          </Text>
                          {incomplete ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth={2.2}>
                                <Circle cx={12} cy={12} r={9} />
                                <Path d="M12 8v5M12 16.5h.01" />
                              </Svg>
                              <Text style={{ color: C.warning, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                                Faltam jogadores (tem {team.memberCount}, mín. {team.minPlayers})
                              </Text>
                            </View>
                          ) : notOwner ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth={2.2}>
                                <Path d="M8 10V7a4 4 0 018 0v3" />
                                <Path d="M5 10h14a1 3 0 011 2v9a1 3 0 01-1 2H5a1 3 0 01-1-2v-9a1 3 0 011-2z" />
                              </Svg>
                              <Text style={{ color: C.warning, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                                Só o dono do time pode inscrever
                              </Text>
                            </View>
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{ flexDirection: "row" }}>
                                {team.memberInitials.map((mi, i) => (
                                  <View
                                    key={mi + i}
                                    style={{
                                      width: 22, height: 22, borderRadius: 11,
                                      backgroundColor: i === 0 ? C.purple : C.lime,
                                      borderWidth: 2,
                                      borderColor: isActive ? "#1E1732" : C.card,
                                      alignItems: "center", justifyContent: "center",
                                      marginLeft: i === 0 ? 0 : -7,
                                    }}
                                  >
                                    <Text style={{ color: i === 0 ? "#fff" : C.limeInk, fontFamily: "Manrope_700Bold", fontSize: 9 }}>{mi}</Text>
                                  </View>
                                ))}
                              </View>
                              <Text style={{ color: C.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                                {team.memberCount === team.minPlayers ? `${team.memberCount} jogadores · pronto` : `${team.memberCount} jogadores`}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{
                          width: 26, height: 26, borderRadius: 13,
                          backgroundColor: isActive ? C.lime : "transparent",
                          borderWidth: isActive ? 0 : 2,
                          borderColor: "rgba(255,255,255,0.14)",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {isActive && (
                            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={C.limeInk} strokeWidth={3.2}>
                              <Path d="m5 12 5 5 9-11" />
                            </Svg>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              {/* Step 2 header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                  Selecione {playersNeeded} jogadores
                </Text>
                <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 20 }}>
                  {selectedMemberIds.length}/{playersNeeded}
                </Text>
              </View>

              {/* Athletes list */}
              <View style={{ gap: 12 }}>
                {selectedTeam?.members.map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  const isCaptain = captainId === m.id;
                  const disabled = !!m.alreadyRegistered;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => toggleMember(m.id, !!m.alreadyRegistered)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.name}${m.isTeamCaptain ? ", capitão do time" : ""}${m.alreadyRegistered ? ", já inscrito" : ""}`}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 13,
                        backgroundColor: isSelected ? C.purpleTintBg : (disabled ? "#101017" : C.card),
                        borderWidth: 1.5,
                        borderColor: isSelected ? C.purple : (disabled ? "rgba(255,255,255,0.05)" : C.cardBorder),
                        borderRadius: 16, padding: 13, paddingHorizontal: 15,
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                      ) : (
                        <View style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: isSelected ? C.purple : (disabled ? "#1C1630" : "#241B38"),
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ color: isSelected ? "#fff" : C.tx2, fontFamily: "Oswald_700Bold", fontSize: 15 }}>
                            {m.initials}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: isSelected ? "#C4A9F5" : C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>
                          {m.name}
                        </Text>
                        {m.isTeamCaptain && !disabled && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Svg width={10} height={10} viewBox="0 0 24 24" fill="#8B5CF6">
                              <Circle cx={12} cy={8} r={5} />
                              <Path d="m8 13-2 8 6-3 6 3-2-8z" />
                            </Svg>
                            <Text style={{ color: "#8B5CF6", fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.5 }}>
                              CAPITÃO DO TIME
                            </Text>
                          </View>
                        )}
                        {disabled && (
                          <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>
                            Já inscrito neste torneio
                          </Text>
                        )}
                      </View>
                      {!disabled && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          {/* Star — captain of registration */}
                          <Pressable
                            onPress={() => setCaptainId(isCaptain ? null : m.id)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={isCaptain ? `Remover ${m.name} como capitão` : `Definir ${m.name} como capitão`}
                            disabled={!isSelected}
                            style={{ opacity: isSelected ? 1 : 0.4 }}
                          >
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill={isCaptain ? "#FFD700" : "none"} stroke={isCaptain ? "#FFD700" : C.tx3} strokeWidth={1.6}>
                              <Path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" />
                            </Svg>
                          </Pressable>
                          {/* Selection check */}
                          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isSelected ? C.lime : "#3A3350"} strokeWidth={2.4}>
                            <Circle cx={12} cy={12} r={9} />
                            {isSelected && <Path d="m8 12 3 3 5-6" />}
                          </Svg>
                        </View>
                      )}
                      {disabled && (
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth={2}>
                          <Path d="M8 10V7a4 4 0 018 0v3" />
                          <Path d="M5 10h14a1 3 0 011 2v9a1 3 0 01-1 2H5a1 3 0 01-1-2v-9a1 3 0 011-2z" />
                        </Svg>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Captain hint */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 16, paddingHorizontal: 4 }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth={2}>
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M12 8v5M12 16.5h.01" />
                </Svg>
                <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, lineHeight: 16, flex: 1 }}>
                  Toque na estrela para definir o capitão da inscrição.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", C.bg]}
        locations={[0, step === 1 ? 0.32 : 0.30]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: step === 1 ? 24 : 22, paddingTop: step === 1 ? 16 : 14, paddingBottom: 26 }}
      >
        {step === 1 ? (
          <View style={{ opacity: !categoryId || !teamId ? 0.25 : 1 }}>
            <Pressable
              onPress={() => {
                if (!categoryId || !teamId) return;
                setStep(2);
              }}
              disabled={!categoryId || !teamId}
              accessibilityRole="button"
              accessibilityLabel={`Continuar com ${selectedTeam?.name ?? "time selecionado"}`}
              style={{
                width: "100%",
                paddingVertical: 17, borderRadius: 18,
                backgroundColor: C.purple,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Text numberOfLines={1} style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>
                {selectedTeam ? `Continuar com ${selectedTeam.name}` : "Continuar"}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.onAccent} strokeWidth={2.6}>
                <Path d="m9 6 6 6-6 6" />
              </Svg>
            </Pressable>
          </View>
        ) : (
          <View style={{ opacity: selectedMemberIds.length !== playersNeeded ? 0.25 : 1 }}>
            <Pressable
              onPress={confirmRegistration}
              disabled={selectedMemberIds.length !== playersNeeded || submitting}
              accessibilityRole="button"
              accessibilityLabel="Confirmar inscrição"
              style={{
                width: "100%",
                paddingVertical: 17, borderRadius: 16,
                backgroundColor: C.purple,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.onAccent} strokeWidth={2.6}>
                <Circle cx={12} cy={12} r={9} />
                <Path d="m8 12 3 3 5-6" />
              </Svg>
              <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Confirmar inscrição
              </Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>

      {/* Aviso de inscricao recusada — uma acao so, no mesmo dialogo usado no resto do app. */}
      <ConfirmDialog
        visible={errorModal !== null}
        title="Inscrição não permitida"
        message={errorModal ?? ""}
        cancelLabel={null}
        actionLabel="Entendi"
        danger
        onCancel={() => setErrorModal(null)}
        onConfirm={() => setErrorModal(null)}
      />
    </SafeAreaView>
  );
}

function CategoryCardContent({ cat, isActive }: { cat: CategoryOption; isActive: boolean }) {
  const C = useScreenColors();
  return (
    <View>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#221B33", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Icon name="trophy" size={18} color={isActive ? "#fff" : "#8B5CF6"} strokeWidth={2.2} />
      </View>
      <Text style={{ color: isActive ? "#fff" : C.tx, fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {TYPE_LABEL[cat.type]}
      </Text>
      <Text style={{ color: isActive ? "rgba(255,255,255,0.72)" : C.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 1 }}>
        {FORMAT_LABEL[cat.format]} · {cat.modality === TournamentModality.BEACH ? "Areia" : "Quadra"}
      </Text>
      {isActive && (
        <View style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.limeInk} strokeWidth={3.4}>
            <Path d="m5 12 5 5 9-11" />
          </Svg>
        </View>
      )}
    </View>
  );
}

function RegistrationSuccess({
  tournamentName, teamName, categoryLabel, price, onDone,
}: {
  tournamentName: string; teamName: string; categoryLabel: string; price: number; onDone: () => void;
}) {
  const C = useScreenColors();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <CelebrationScreen
      overline="Inscrição enviada"
      title={"NA FILA\nDO TIME"}
      subtitle="Aguarde a confirmação do organizador após o pagamento."
      ctaLabel="Concluir"
      onCta={onDone}
      accentColor={C.isDark ? undefined : C.purple}
      ctaTextColor={C.isDark ? undefined : "#FFFFFF"}
      extra={
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: "rgba(255,193,77,0.14)",
          borderWidth: 1, borderColor: "rgba(255,193,77,0.3)",
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
        }}>
          <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.warning, opacity: pulse }} />
          <Text style={{ color: C.warning, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 0.6 }}>
            PENDENTE DE CONFIRMAÇÃO
          </Text>
        </View>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: C.lime, backgroundColor: "#2D1B69", alignItems: "center", justifyContent: "center" }}>
          <Icon name="trophy" size={19} color={C.lime} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{tournamentName}</Text>
          <Text numberOfLines={1} style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>{teamName} · {categoryLabel}</Text>
        </View>
        <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 18 }}>
          R$ {price.toFixed(2).replace(".", ",")}
        </Text>
      </View>
    </CelebrationScreen>
  );
}
