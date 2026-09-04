import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useApi } from "@/hooks/useApi";
import { api, getErrorMessage } from "@/services/api";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/hooks/useTheme";

function useScreenColors() {
  const { isDark, colors } = useTheme();
  return useMemo(() => ({
    isDark,
    bg: colors.bg.base,
    // Light: a soft lavender-tinted surface (not stark #FFF) sits better with
    // the purple/lime accents and the lavender page bg; border gets a faint
    // purple tint so the card edge still reads without the harsh white.
    card: isDark ? "#16181C" : "#FCFBFF",
    cardBorder: isDark ? colors.border.card : "rgba(124,58,237,0.14)",
    purple: "#7C3AED",
    purpleDeep: "#2D1B69",
    // Initials-avatar fallback: dark navy-purple reads as a harsh blob on a
    // light card, so light mode uses a soft purple tint with purple ink.
    avatarBg: isDark ? "#2D1B69" : "#EDE7FB",
    avatarInk: isDark ? "#C6F82A" : "#7C3AED",
    // Status cards keep the neutral card bg (like MyFriendliesScreen) and
    // signal state only through a tinted border + status pill — a full
    // colored card bg reads badly in light mode.
    paidBorder: isDark ? "rgba(198,248,42,0.22)" : "rgba(198,248,42,0.45)",
    dangerTintBg: isDark ? "rgba(255,77,94,0.1)" : "#FDE8EA",
    dangerTintBorder: isDark ? "rgba(255,77,94,0.25)" : "rgba(255,77,94,0.3)",
    lime: "#C6F82A",
    limeInk: "#12100A",
    warning: "#FFC14D",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
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

const MEMBER_COLORS = ["#5B8DEF", "#EF7A5B", "#3FB98A", "#B15BEF", "#EFB15B", "#EF5B9A"];

function hashIndex(str: string, len: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type RegStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED" | "CANCELLED";
type TabFilter = "pending" | "paid" | "rejected" | "all";

interface Registration {
  id: string;
  status: RegStatus;
  paidAt: string | null;
  createdAt: string;
  team: { id: string; name: string; avatarUrl: string | null };
  category: { id: string; type: string; format: string; modality: string; registrationPrice?: number | string } | null;
  members: Array<{
    isCaptain: boolean;
    teamMember: {
      id: string;
      guestName: string | null;
      isGuest: boolean;
      user: { id: string; name: string; avatarUrl: string | null } | null;
    };
  }>;
}

function formatPaidShort(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

const RegistrationCard = React.memo(function RegistrationCard({
  r, canReject, isLoading, onConfirm, onReject,
}: {
  r: Registration;
  canReject: boolean;
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onReject: (id: string, teamName: string, refund?: boolean) => void;
}) {
  const C = useScreenColors();
  const isPaid = r.status === "CONFIRMED";
  const initials = getInitials(r.team.name);
  const captain = r.members.find((m) => m.isCaptain)?.teamMember?.user;
  const captainName = captain?.name ?? r.members[0]?.teamMember?.user?.name ?? "";
  const regPrice = r.category?.registrationPrice != null ? Number(r.category.registrationPrice) : 0;

  if (r.status === "REJECTED") {
    return (
      <View style={{
        borderRadius: 20, padding: 15,
        backgroundColor: C.card,
        borderWidth: 1, borderColor: C.dangerTintBorder,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          {r.team.avatarUrl ? (
            <Image source={{ uri: r.team.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 13, opacity: 0.5 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.avatarBg, opacity: 0.5, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.avatarInk, fontFamily: "Oswald_700Bold", fontSize: 15 }}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_700Bold", fontSize: 15 }}>{r.team.name}</Text>
            <Text style={{ color: C.tx3, fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 3 }}>
              Capitão {captainName.split(" ")[0]}
            </Text>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: "rgba(255,77,94,0.14)",
            paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12,
          }}>
            <Icon name="close" size={14} color="#FF4D5E" strokeWidth={2.6} />
            <Text style={{ color: "#FF4D5E", fontFamily: "Manrope_700Bold", fontSize: 12 }}>Recusado</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isPaid) {
    return (
      <View style={{
        borderRadius: 20, padding: 15,
        backgroundColor: C.card,
        borderWidth: 1, borderColor: C.paidBorder,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          {r.team.avatarUrl ? (
            <Image source={{ uri: r.team.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 13 }} />
          ) : (
            <LinearGradient
              colors={["#8B5CF6", "#6D3BEA"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{ width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 15 }}>{initials}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 15 }}>{r.team.name}</Text>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 3 }}>
              Capitão {captainName.split(" ")[0]}{r.paidAt ? ` · pago em ${formatPaidShort(r.paidAt)}` : ""}
            </Text>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: C.limeTintBg,
            paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12,
          }}>
            <Icon name="check-circle" size={15} color={C.isDark ? C.lime : C.purple} strokeWidth={2.6} />
            <Text style={{ color: C.isDark ? C.lime : C.purple, fontFamily: "Manrope_700Bold", fontSize: 12 }}>Pago</Text>
          </View>
        </View>
        {canReject && (
          <Pressable
            onPress={() => onReject(r.id, r.team.name, true)}
            disabled={isLoading}
            style={{
              marginTop: 12, paddingVertical: 10, borderRadius: 12,
              borderWidth: 1.5, borderColor: "rgba(255,77,94,0.3)",
              backgroundColor: "rgba(255,77,94,0.06)",
              alignItems: "center", justifyContent: "center",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FF4D5E" />
            ) : (
              <Text style={{ color: "#FF4D5E", fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Recusar · time não vai mais
              </Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 20, padding: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 14 }}>
        {r.team.avatarUrl ? (
          <Image source={{ uri: r.team.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 13 }} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.avatarBg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.avatarInk, fontFamily: "Oswald_700Bold", fontSize: 15 }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: C.tx, fontFamily: "Manrope_700Bold", fontSize: 15 }}>{r.team.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 }}>
            <View style={{ flexDirection: "row" }}>
              {r.members.slice(0, 3).map((m, i) => {
                const tm = m.teamMember;
                const memberId = tm.user?.id ?? tm.id;
                const memberName = tm.user?.name ?? tm.guestName ?? "?";
                const memberAvatar = tm.user?.avatarUrl ?? null;
                return (
                <View key={memberId} style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: memberAvatar ? undefined : MEMBER_COLORS[hashIndex(memberId, MEMBER_COLORS.length)],
                  borderWidth: 2, borderColor: C.card,
                  alignItems: "center", justifyContent: "center",
                  marginLeft: i > 0 ? -6 : 0,
                  overflow: "hidden",
                }}>
                  {memberAvatar ? (
                    <Image source={{ uri: memberAvatar }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                  ) : (
                    <Text style={{ color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 8 }}>{memberName[0]?.toUpperCase()}</Text>
                  )}
                </View>
              );
              })}
            </View>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
              {captain ? `Capitão ${captainName.split(" ")[0]}` : `${r.members.length} atletas`}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {regPrice > 0 ? (
            <>
              <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 16 }}>R$ {regPrice}</Text>
              <Text style={{ color: C.warning, fontFamily: "Manrope_600SemiBold", fontSize: 10 }}>a receber</Text>
            </>
          ) : (
            <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Grátis</Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {canReject && (
          <Pressable
            onPress={() => onReject(r.id, r.team.name)}
            disabled={isLoading}
            style={{
              paddingVertical: 12, paddingHorizontal: 16, borderRadius: 13,
              borderWidth: 1.5, borderColor: "rgba(255,77,94,0.35)",
              backgroundColor: "rgba(255,77,94,0.08)",
              alignItems: "center", justifyContent: "center",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <Icon name="close" size={16} color="#FF4D5E" strokeWidth={2.4} />
          </Pressable>
        )}
        <Pressable
          onPress={() => onConfirm(r.id)}
          disabled={isLoading}
          style={{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            paddingVertical: 12, borderRadius: 13,
            borderWidth: 1.5, borderColor: "rgba(198,248,42,0.4)",
            backgroundColor: "rgba(198,248,42,0.08)",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={C.lime} />
          ) : (
            <>
              <Icon name="circle" size={16} color={C.lime} strokeWidth={2.4} />
              <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>Confirmar pagamento</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
});

export function ManageRegistrationsScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const tournamentId = route?.params?.tournamentId;
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: registrations, loading, error, refetch } = useApi<Registration[]>(
    () => api.get(`/tournaments/${tournamentId}/registrations`).then((r) => r.data),
    [tournamentId],
  );

  const { data: tournament } = useApi<{
    name: string;
    status: string;
    categories?: Array<{ format: string; modality: string }>;
    stages?: Array<{ maxTeams: number | null }>;
  }>(
    () => api.get(`/tournaments/${tournamentId}`).then((r) => r.data),
    [tournamentId],
  );

  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  const handleConfirm = useCallback(async (regId: string) => {
    setActionLoading(regId);
    try {
      await api.patch(`/tournaments/${tournamentId}/registrations/${regId}/paid`, { paid: true });
      await refetch();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Erro ao confirmar pagamento"));
    } finally {
      setActionLoading(null);
    }
  }, [tournamentId, refetch]);

  const handleReject = useCallback((regId: string, teamName: string, refund = false) => {
    Alert.alert(
      refund ? "Recusar time pago" : "Recusar inscrição",
      refund
        ? `O ${teamName} já pagou. Recusar agora remove o time do torneio — combine o reembolso diretamente com o capitão. Continuar?`
        : `Tem certeza que quer recusar a inscrição do ${teamName}? Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(regId);
            try {
              await api.patch(`/tournaments/${tournamentId}/registrations/${regId}/reject`);
              await refetch();
            } catch (err: any) {
              Alert.alert("Erro", getErrorMessage(err, "Erro ao recusar inscrição"));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [tournamentId, refetch]);

  const active = (registrations ?? []).filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED");
  const paidList = active.filter((r) => r.status === "CONFIRMED");
  const pendingList = active.filter((r) => r.status === "PENDING_CONFIRMATION");
  const rejectedList = (registrations ?? []).filter((r) => r.status === "REJECTED");

  const price = active[0]?.category?.registrationPrice != null ? Number(active[0].category.registrationPrice) : 0;
  const totalSlots = tournament?.stages?.[0]?.maxTeams ?? active.length;
  const totalRevenue = totalSlots * price;
  const collectedRevenue = paidList.length * price;
  const pct = totalRevenue > 0 ? Math.round((collectedRevenue / totalRevenue) * 100) : 0;
  const isFree = price === 0;
  const confirmedPct = totalSlots > 0 ? Math.round((paidList.length / totalSlots) * 100) : 0;

  const filtered = activeTab === "pending" ? pendingList : activeTab === "paid" ? paidList : activeTab === "rejected" ? rejectedList : active;
  const canReject = tournament?.status === "REGISTRATION_OPEN";

  const subtitle = tournament
    ? `${tournament.name}${tournament.categories?.[0] ? ` · ${tournament.categories[0].modality === "MALE" ? "Masc" : tournament.categories[0].modality === "FEMALE" ? "Fem" : "Misto"} · ${tournament.categories[0].format === "PAIR" ? "Dupla" : tournament.categories[0].format}` : ""}`
    : "";

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center" }}>
            {error.includes("ownership") || error.includes("Forbidden") || error.includes("403") ? "Apenas o organizador pode ver as inscrições." : error}
          </Text>
          <Pressable onPress={() => navigation?.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: C.link, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      {loading && !registrations ? (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
          {/* header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <Skeleton width={40} height={40} radius={14} />
            <View style={{ flex: 1 }}>
              <Skeleton width={"55%"} height={22} radius={7} />
              <View style={{ height: 6 }} />
              <Skeleton width={"80%"} height={12} radius={5} />
            </View>
          </View>
          {/* revenue card */}
          <Skeleton width={"100%"} height={104} radius={18} style={{ marginBottom: 18 }} />
          {/* tabs */}
          <Skeleton width={"100%"} height={44} radius={14} style={{ marginBottom: 16 }} />
          {/* list cards */}
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={"100%"} height={92} radius={20} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item: r }) => (
            <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
              <RegistrationCard
                r={r}
                canReject={canReject}
                isLoading={actionLoading === r.id}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 14 }}>
                {activeTab === "pending" ? "Nenhuma inscrição pendente." : activeTab === "paid" ? "Nenhuma inscrição paga." : activeTab === "rejected" ? "Nenhuma inscrição recusada." : "Nenhuma inscrição encontrada."}
              </Text>
            </View>
          }
          ListHeaderComponent={
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <Pressable
                onPress={() => navigation?.goBack()}
                style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="back" size={19} color={C.tx2} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.3, textTransform: "uppercase" }}>Inscrições</Text>
                {subtitle ? <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{subtitle}</Text> : null}
              </View>
            </View>

            {/* Revenue card — same solid card language as the tournament
                detail "Vagas preenchidas" card (no gradient = no banding).
                Free tournament (price 0): show "Grátis" and track confirmed
                teams instead of a meaningless R$ 0 / 0. */}
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 18, marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
                <View>
                  <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{isFree ? "Inscrição" : "Arrecadado"}</Text>
                  {isFree ? (
                    <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5, textTransform: "uppercase" }}>Grátis</Text>
                  ) : (
                    <Text style={{ fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5 }}>
                      <Text style={{ color: C.tx }}>R$ {collectedRevenue}</Text>
                      <Text style={{ color: C.tx3, fontSize: 17 }}> / {totalRevenue}</Text>
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 20 }}>{isFree ? confirmedPct : pct}%</Text>
                  <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 }}>{isFree ? `${paidList.length} de ${totalSlots} confirmados` : `${paidList.length} de ${totalSlots} times`}</Text>
                </View>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <LinearGradient
                  colors={["#8B5CF6", C.lime]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: `${Math.max(isFree ? confirmedPct : pct, paidList.length > 0 ? 6 : 0)}%` as any, height: "100%", borderRadius: 4 }}
                />
              </View>
            </View>

            {/* Tab bar */}
            <View style={{
              flexDirection: "row", gap: 6,
              backgroundColor: C.card,
              borderWidth: 1, borderColor: C.cardBorder,
              borderRadius: 14, padding: 4, marginBottom: 16,
            }}>
              {([
                { key: "pending" as TabFilter, label: `Pendentes · ${pendingList.length}` },
                { key: "paid" as TabFilter, label: `Pagas · ${paidList.length}` },
                { key: "rejected" as TabFilter, label: `Recusadas · ${rejectedList.length}` },
                { key: "all" as TabFilter, label: "Todas" },
              ]).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, backgroundColor: isActive ? C.purple : "transparent" }}
                  >
                    <Text style={{ color: isActive ? "#fff" : C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
