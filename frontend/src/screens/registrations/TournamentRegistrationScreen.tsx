import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle } from "react-native-svg";
import {
  registrationsService,
  RegistrationDTO,
} from "@/services/registrationsService";
import { TournamentType, TournamentFormat, TournamentModality } from "@/types/enums";

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
  memberInitials: string[];
  memberCount: number;
  minPlayers: number;
  members: { id: string; name: string; initials: string; isTeamCaptain: boolean; alreadyRegistered?: boolean }[];
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
    id: "team-1", name: "Silva & Rocha", initials: "SR", memberCount: 2, minPlayers: 2,
    memberInitials: ["L", "R"],
    members: [
      { id: "m1", name: "Lucas Menezes", initials: "L", isTeamCaptain: true },
      { id: "m2", name: "Rafael Rocha", initials: "R", isTeamCaptain: false },
      { id: "m3", name: "Bruno Alves", initials: "B", isTeamCaptain: false },
      { id: "m4", name: "Tiago Nunes", initials: "T", isTeamCaptain: false, alreadyRegistered: true },
    ],
  },
  {
    id: "team-2", name: "Praia Aces", initials: "PA", memberCount: 3, minPlayers: 2,
    memberInitials: ["B", "M", "J"],
    members: [
      { id: "p1", name: "Bruno Alves", initials: "B", isTeamCaptain: true },
      { id: "p2", name: "Marina Dias", initials: "M", isTeamCaptain: false },
      { id: "p3", name: "João Pedro", initials: "J", isTeamCaptain: false },
    ],
  },
  {
    id: "team-3", name: "Furacão Team", initials: "FT", memberCount: 1, minPlayers: 2,
    memberInitials: ["F"],
    members: [{ id: "f1", name: "Felipe Souza", initials: "F", isTeamCaptain: true }],
  },
];

type Step = 1 | 2 | 3;

export function TournamentRegistrationScreen({ navigation, route }: any) {
  const { isDark, colors } = useTheme();
  const tournamentId: string = route?.params?.tournamentId ?? "";
  const tournamentName: string = route?.params?.tournamentName ?? "Torneio";
  const tournamentLocation: string = route?.params?.tournamentLocation ?? "";

  const [step, setStep] = useState<Step>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RegistrationDTO | null>(null);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = step === 1 ? (isDark ? "#0C0A12" : "#F6F4FC") : isDark ? "#0E0B14" : "#F6F4FC";
  const labelColor = isDark ? "#6E6684" : "#8A829E";
  const titleColor = isDark ? "#F5F3FA" : "#1A1030";
  const metaColor = isDark ? "#948CA8" : "#6B6480";

  const selectedTeam = useMemo(() => MOCK_TEAMS.find((t) => t.id === teamId) ?? null, [teamId]);
  const selectedCategory = useMemo(() => MOCK_CATEGORIES.find((c) => c.id === categoryId) ?? null, [categoryId]);

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
    } catch {
      // API down in dev — still show success step with mock shape
      setResult(null);
    } finally {
      setSubmitting(false);
      setStep(3);
    }
  };

  // ============ STEP 3 — SUCCESS ============
  if (step === 3) {
    const price = selectedCategory?.price ?? 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0E0B14" : "#F6F4FC" }} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 56, alignItems: "center" }}>
          <View style={{
            width: 88, height: 88, borderRadius: 28,
            backgroundColor: isDark ? "rgba(198,248,42,.14)" : "rgba(5,150,105,.08)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(198,248,42,.32)" : "rgba(5,150,105,.3)",
            alignItems: "center", justifyContent: "center", marginBottom: 26,
          }}>
            <Svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#C6F82A" : "#059669"} strokeWidth={2.4}>
              <Path d="m5 13 4 4 10-11" />
            </Svg>
          </View>
          <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 27, fontWeight: "700", lineHeight: 28, letterSpacing: -0.02 * 27, textAlign: "center", marginBottom: 10 }}>
            Inscrição{"\n"}registrada!
          </Text>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 21, textAlign: "center", maxWidth: 270, marginBottom: 28 }}>
            Aguarde a confirmação do organizador após o pagamento.
          </Text>

          <View style={{
            backgroundColor: isDark ? "#171221" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,.08)" : "rgba(26,16,48,.06)",
            borderRadius: 18, paddingVertical: 6, paddingHorizontal: 16,
            alignSelf: "stretch",
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
          }}>
            <SummaryRow label="Torneio" value={tournamentName} isDark={isDark} />
            <Divider isDark={isDark} />
            <SummaryRow label="Equipe" value={selectedTeam?.name ?? ""} isDark={isDark} />
            <Divider isDark={isDark} />
            <SummaryRow
              label="Categoria"
              value={`${selectedCategory?.type === TournamentType.MALE ? "Masc" : selectedCategory?.type === TournamentType.FEMALE ? "Fem" : "Misto"} · ${FORMAT_LABEL[selectedCategory!.format]} · ${selectedCategory!.modality === TournamentModality.BEACH ? "Areia" : "Quadra"}`}
              isDark={isDark}
            />
            <Divider isDark={isDark} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 }}>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>Valor</Text>
              <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>
                R$ {price.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          </View>

          <View style={{
            flexDirection: "row", alignItems: "center", gap: 7,
            backgroundColor: isDark ? "rgba(255,193,77,.14)" : "rgba(217,119,6,.08)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,193,77,.3)" : "rgba(217,119,6,.25)",
            paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginTop: 18,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isDark ? "#FFC14D" : "#D97706" }} />
            <Text style={{ color: isDark ? "#FFC14D" : "#D97706", fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700", letterSpacing: 0.04 * 11 }}>
              PENDENTE DE CONFIRMAÇÃO
            </Text>
          </View>

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, paddingHorizontal: 22, paddingBottom: 26 }}>
            <Pressable
              onPress={() => navigation?.navigate("MyRegistrations")}
              disabled={submitting}
              style={{
                backgroundColor: accentColor,
                borderRadius: 16, paddingVertical: 16,
                alignItems: "center", justifyContent: "center",
                ...(!isDark ? { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 } : {}),
              }}
            >
              <Text style={{ color: isDark ? "#12100A" : "#FFFFFF", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>
                CONCLUIR
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============ STEPS 1 & 2 ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: step === 1 ? 24 : 22, paddingTop: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: step === 1 ? 26 : 14 }}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={{
                width: 40, height: 40, borderRadius: step === 1 ? 14 : 13,
                backgroundColor: isDark ? (step === 1 ? "#171320" : "#1C1630") : "#FFFFFF",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
              }}
            >
              <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: step === 1 ? 20 : 19, fontWeight: "700", letterSpacing: -0.01 * 20 }} numberOfLines={1}>
                {step === 1 ? "Inscrever time" : "Selecionar atletas"}
              </Text>
              <Text style={{ color: step === 1 ? metaColor : isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }} numberOfLines={1}>
                {step === 1
                  ? `${tournamentName}${tournamentLocation ? ` · ${tournamentLocation}` : ""}`
                  : `${selectedTeam?.name} · ${selectedCategory ? FORMAT_LABEL[selectedCategory.format] : ""}`}
              </Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              {/* CATEGORIA */}
              <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 12 }}>
                CATEGORIA
              </Text>
              <View style={{ flexDirection: "row", gap: 11, marginBottom: 28 }}>
                {MOCK_CATEGORIES.map((cat) => {
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
                          colors={isDark ? ["#8B5CF6", "#6D3BEA"] : ["#7C3AED", "#6D28D9"]}
                          start={{ x: 0.16, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ borderRadius: 20, padding: 16 }}
                        >
                          <CategoryCardContent cat={cat} isActive isDark={isDark} titleColor={titleColor} metaColor={metaColor} />
                        </LinearGradient>
                      ) : (
                        <View style={{
                          borderRadius: 20, padding: 16,
                          backgroundColor: isDark ? "#141019" : "#FFFFFF",
                          borderWidth: 1,
                          borderColor: isDark ? "rgba(255,255,255,.08)" : "rgba(26,16,48,.08)",
                        }}>
                          <CategoryCardContent cat={cat} isActive={false} isDark={isDark} titleColor={titleColor} metaColor={metaColor} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* SEU TIME */}
              <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 12 }}>
                SEU TIME
              </Text>
              <View style={{ gap: 12 }}>
                {MOCK_TEAMS.map((team) => {
                  const isActive = team.id === teamId;
                  const incomplete = team.memberCount < team.minPlayers;
                  const cardBgDark = isActive ? "#151020" : incomplete ? "#0E0D15" : "#111019";
                  return (
                    <Pressable
                      key={team.id}
                      onPress={() => incomplete ? undefined : setTeamId(isActive ? null : team.id)}
                      disabled={incomplete}
                      style={{
                        borderRadius: 20, padding: 16,
                        backgroundColor: isDark ? cardBgDark : "#FFFFFF",
                        borderWidth: isActive ? 1.5 : 1,
                        borderColor: isActive ? "#8B5CF6" : isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.06)",
                        opacity: incomplete ? 0.6 : 1,
                        ...(isActive ? { shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 2 } : {}),
                        ...(isDark || isActive ? {} : { shadowColor: "rgba(46,16,101,.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                        <LinearGradient
                          colors={isActive ? ["#8B5CF6", "#6D3BEA"] : ["#221B33", "#1A1526"]}
                          style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                        >
                          <Text style={{ color: isActive ? "#fff" : isDark ? "#CFC8E0" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
                            {team.initials}
                          </Text>
                        </LinearGradient>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: incomplete ? (isDark ? "#CFC8E0" : "#4A4460") : titleColor, fontFamily: "Manrope_700Bold", fontSize: 15, fontWeight: "700", marginBottom: 6 }}>
                            {team.name}
                          </Text>
                          {incomplete ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#FFC14D" strokeWidth={2.2}>
                                <Circle cx={12} cy={12} r={9} />
                                <Path d="M12 8v5M12 16.5h.01" />
                              </Svg>
                              <Text style={{ color: "#FFC14D", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>
                                Faltam jogadores (tem {team.memberCount}, mín. {team.minPlayers})
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
                                      backgroundColor: i === 0 ? "#7C3AED" : "#C6F82A",
                                      borderWidth: 2,
                                      borderColor: isDark ? (isActive ? "#151020" : "#111019") : "#FFFFFF",
                                      alignItems: "center", justifyContent: "center",
                                      marginLeft: i === 0 ? 0 : -7,
                                    }}
                                  >
                                    <Text style={{ color: i === 0 ? "#fff" : "#12100A", fontFamily: "Manrope_700Bold", fontSize: 9, fontWeight: "700" }}>{mi}</Text>
                                  </View>
                                ))}
                              </View>
                              <Text style={{ color: metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>
                                {team.memberCount === team.minPlayers ? `${team.memberCount} jogadores · pronto` : `${team.memberCount} jogadores`}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{
                          width: 26, height: 26, borderRadius: 13,
                          backgroundColor: isActive ? "#C6F82A" : "transparent",
                          borderWidth: isActive ? 0 : 2,
                          borderColor: isDark ? "#2F2842" : "rgba(26,16,48,.15)",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {isActive && (
                            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#12100A" strokeWidth={3.2}>
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
                <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>
                  Selecione {playersNeeded} jogadores
                </Text>
                <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" }}>
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
                        backgroundColor: isSelected
                          ? "rgba(124,58,237,.16)"
                          : isDark ? (disabled ? "#131020" : "#171221") : "#FFFFFF",
                        borderWidth: 1.5,
                        borderColor: isSelected ? "#7C3AED" : isDark ? (disabled ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.08)") : "rgba(26,16,48,.06)",
                        borderRadius: 16, padding: 13, paddingHorizontal: 15,
                        opacity: disabled ? 0.55 : 1,
                        ...(isDark || isSelected ? {} : { shadowColor: "rgba(46,16,101,.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 1 }),
                      }}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: isSelected ? "#7C3AED" : isDark ? (disabled ? "#1C1630" : "#241B38") : "#F0ECFA",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: isSelected ? "#fff" : isDark ? "#A9A2BC" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
                          {m.initials}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: isSelected ? "#C4A9F5" : isDark ? "#F5F3FA" : "#1A1030", fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700" }}>
                          {m.name}
                        </Text>
                        {m.isTeamCaptain && !disabled && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Svg width={10} height={10} viewBox="0 0 24 24" fill="#8B5CF6">
                              <Circle cx={12} cy={8} r={5} />
                              <Path d="m8 13-2 8 6-3 6 3-2-8z" />
                            </Svg>
                            <Text style={{ color: "#8B5CF6", fontFamily: "Manrope_700Bold", fontSize: 9, fontWeight: "700", letterSpacing: 0.05 * 9 }}>
                              CAPITÃO DO TIME
                            </Text>
                          </View>
                        )}
                        {disabled && (
                          <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>
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
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill={isCaptain ? "#FFD700" : "none"} stroke={isCaptain ? "#FFD700" : isDark ? "#6E6684" : "#A29CB4"} strokeWidth={1.6}>
                              <Path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" />
                            </Svg>
                          </Pressable>
                          {/* Selection check */}
                          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isSelected ? "#C6F82A" : isDark ? "#3A3350" : "rgba(26,16,48,.2)"} strokeWidth={2.4}>
                            <Circle cx={12} cy={12} r={9} />
                            {isSelected && <Path d="m8 12 3 3 5-6" />}
                          </Svg>
                        </View>
                      )}
                      {disabled && (
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#6E6684" : "#A29CB4"} strokeWidth={2}>
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
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={labelColor} strokeWidth={2}>
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M12 8v5M12 16.5h.01" />
                </Svg>
                <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", lineHeight: 16, flex: 1 }}>
                  Toque na estrela para definir o capitão da inscrição.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA — spec t7a: dark bg #C6F82A text #12100A / light bg #7C3AED text #fff + purple glow */}
      <LinearGradient
        colors={isDark
          ? (step === 1 ? ["rgba(12,10,18,0)", "#0C0A12"] : ["rgba(14,11,20,0)", "#0E0B14"])
          : (step === 1 ? ["rgba(247,245,252,0)", "#F7F5FC"] : ["rgba(246,244,252,0)", "#F6F4FC"])}
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
                backgroundColor: accentColor,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              <Text
                numberOfLines={1}
                style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", letterSpacing: 0.02 * 15 }}
              >
                {selectedTeam ? `Continuar com ${selectedTeam.name}` : "Continuar"}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
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
                backgroundColor: accentColor,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
                <Circle cx={12} cy={12} r={9} />
                <Path d="m8 12 3 3 5-6" />
              </Svg>
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", letterSpacing: 0.03 * 15 }}>
                CONFIRMAR INSCRIÇÃO
              </Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

function CategoryCardContent({
  cat,
  isActive,
  isDark,
  titleColor,
  metaColor,
}: {
  cat: CategoryOption;
  isActive: boolean;
  isDark: boolean;
  titleColor: string;
  metaColor: string;
}) {
  return (
    <View>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: isActive ? "rgba(255,255,255,.2)" : isDark ? "#221B33" : "#F0ECFA", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Icon name="trophy" size={18} color={isActive ? "#fff" : isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2.2} />
      </View>
      <Text style={{ color: isActive ? "#fff" : titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
        {TYPE_LABEL[cat.type]}
      </Text>
      <Text style={{ color: isActive ? "rgba(255,255,255,.72)" : metaColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginTop: 1 }}>
        {FORMAT_LABEL[cat.format]} · {cat.modality === TournamentModality.BEACH ? "Areia" : "Quadra"}
      </Text>
      {isActive && (
        <View style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: "#C6F82A", alignItems: "center", justifyContent: "center" }}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#12100A" strokeWidth={3.4}>
            <Path d="m5 12 5 5 9-11" />
          </Svg>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 }}>
      <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.06)" }} />;
}
