import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import Svg, { Circle, Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { tournamentsService } from "@/services/tournamentsService";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/services/api";
import { nextPendingStage, stageIndex } from "@/shared/stages";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTC, StatusPill } from "./_tournamentKit";
import { formatDate } from "@/utils/dateFormat";

const HERO_IMAGE = "https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=820&q=75";

const PRIZES = [
  { emoji: "\u{1F947}", amount: "R$ 500", label: "1º lugar", tone: "gold" as const },
  { emoji: "\u{1F948}", amount: "R$ 250", label: "2º lugar", tone: "silver" as const },
  { emoji: "\u{1F949}", amount: "R$ 100", label: "3º lugar", tone: "bronze" as const },
];

type PillTone = "open" | "closed" | "progress" | "neutral";
function getStatusLabel(status: string | undefined): { label: string; open: boolean; tone: PillTone } {
  switch (status) {
    case "PUBLISHED":
    case "REGISTRATION_OPEN":
      return { label: "INSCRIÇÕES ABERTAS", open: true, tone: "open" };
    case "REGISTRATION_CLOSED":
      return { label: "INSCRIÇÕES ENCERRADAS", open: false, tone: "neutral" };
    case "BRACKET_GENERATED":
    case "IN_PROGRESS":
      return { label: "EM ANDAMENTO", open: false, tone: "progress" };
    case "FINISHED":
      return { label: "ENCERRADO", open: false, tone: "closed" };
    case "DRAFT":
      return { label: "RASCUNHO", open: false, tone: "neutral" };
    case "CANCELLED":
      return { label: "CANCELADO", open: false, tone: "closed" };
    default:
      return { label: "INSCRIÇÕES ABERTAS", open: true, tone: "open" };
  }
}

function getOrganizerInitials(name: string | undefined): string {
  if (!name) return "??";
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function Section({ label }: { label: string }) {
  const TC = useTC();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: TC.lime }} />
      <Text style={{ color: TC.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

export function TournamentDetailScreen({ navigation, route }: any) {
  const TC = useTC();
  const currentUser = useAuthStore((s) => s.user);
  const id = route?.params?.id;

  const { data: tournament, loading, error, refetch } = useApi(() => tournamentsService.findOne(id), [id]);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); }, [refetch]));

  const isOwnerForReferees = tournament?.ownerId === currentUser?.id || tournament?.organizerId === currentUser?.id;
  const { data: referees, refetch: refetchReferees } = useApi(
    () => (id && isOwnerForReferees) ? tournamentsService.getReferees(id) : Promise.resolve([]),
    [id, isOwnerForReferees],
  );
  useFocusEffect(useCallback(() => { refetchReferees({ keepData: false }); }, [refetchReferees]));
  const [actionLoading, setActionLoading] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<"close" | "start" | "delete" | null>(null);

  if (loading && !tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={TC.lime} />
      </View>
    );
  }

  if (error && !tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: TC.purple }}>
          <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const statusInfo = getStatusLabel(tournament?.status);
  const heroImage = tournament?.imageUrl || tournament?.coverUrl || HERO_IMAGE;
  const tournamentName = tournament?.name ?? "Torneio";

  const handleShareTournament = async () => {
    try {
      const link = `toqueplay://tournament/${id}`;
      await Share.share({ message: `Confira o torneio ${tournamentName} no ToquePlay!\n${link}` });
    } catch {}
  };
  const owner = tournament?.owner ?? tournament?.organizer;
  const organizerName = owner?.name ?? "Organizador";
  const organizerInitials = getOrganizerInitials(owner?.name);
  const organizerAvatar = owner?.avatarUrl ?? null;
  const organizerId = owner?.id;
  const description = tournament?.description;

  // Num circuito o que interessa e a proxima etapa pendente, nao a primeira: com 2 de 6 ja
  // realizadas, mostrar a etapa 1 faria o torneio parecer parado no passado.
  const stage = nextPendingStage(tournament?.stages as any) ?? tournament?.stages?.[0];
  const stageNumber = stage ? stageIndex(tournament?.stages as any, stage.id) : 0;
  const totalStages = tournament?.stages?.length ?? 0;
  const stageDate = stage?.date ?? tournament?.date;
  const dateStr = stageDate ? formatDate(stageDate, { day: "numeric", month: "short", year: "numeric" }) : null;
  const stageCity = stage?.city ?? tournament?.city;
  const stageState = stage?.state ?? tournament?.state;
  const stageAddress = stage?.address ?? tournament?.address;
  const locationStr = stageCity && stageState ? `${stageCity}, ${stageState}` : stageAddress || null;

  const rules = tournament?.rules ? tournament.rules.split("\n").filter((r: string) => r.trim().length > 0) : [];

  const categories = (tournament?.categories ?? []).map((cat: any) => {
    const formatLabel = cat.format === "PAIR" ? "Dupla" : cat.format === "QUARTET" ? "Quarteto" : cat.format === "SEXTET" ? "Sexteto" : cat.format ?? "";
    const typeLabel = cat.type === "MALE" ? "Masculino" : cat.type === "FEMALE" ? "Feminino" : cat.type === "MIX" ? "Misto" : cat.type ?? "";
    const modalityLabel = cat.modality === "BEACH" ? "Areia" : cat.modality === "COURT" ? "Quadra" : "";
    return {
      icon: (cat.type === "MIX" ? "mixed" : "male") as "male" | "mixed",
      name: cat.name ?? `${typeLabel} ${formatLabel}`,
      detail: [typeLabel, modalityLabel, formatLabel].filter(Boolean).join(" · "),
      slots: (stage?.maxTeams ?? cat.maxTeams) ? `${stage?.maxTeams ?? cat.maxTeams} vagas` : "",
      price: cat.registrationPrice != null ? `R$ ${Number(cat.registrationPrice).toFixed(2).replace(".", ",")}` : null,
    };
  });

  const prizePot = tournament?.prizePot;
  const isOwner = tournament?.ownerId === currentUser?.id || tournament?.organizerId === currentUser?.id;
  const status = tournament?.status;

  // Enriched facts (real data only)
  const teamsCount = tournament?._count?.registrations ?? 0;
  const maxTeams = stage?.maxTeams ?? null;
  const catCount = categories.length;
  const target = stageDate ? new Date(stageDate) : null;
  // Compare by calendar day (local), so "same day" = 0 = "É HOJE" instead of rounding a few hours up to 1.
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const daysLeft = target && !isNaN(target.getTime())
    ? Math.round((startOfDay(target) - startOfDay(new Date())) / 86400000)
    : null;
  const prizeTotal = prizePot != null && prizePot > 0
    ? `R$ ${Number(prizePot).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : null;

  const stageLat = stage?.latitude;
  const stageLng = stage?.longitude;
  const hasLocation = !!(stageAddress || locationStr || (stageLat != null && stageLng != null));
  const openMaps = () => {
    const query = stageLat != null && stageLng != null
      ? `${stageLat},${stageLng}`
      : [stageAddress, locationStr].filter(Boolean).join(", ") || tournamentName;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => Alert.alert("Erro", "Não foi possível abrir o mapa."));
  };

  // Nao usa handleAction porque aquele faz refetch ao final — aqui o torneio deixou de existir,
  // entao o certo e voltar para a tela anterior.
  const handleDelete = async () => {
    if (!tournament) return;
    setActionLoading(true);
    try {
      await tournamentsService.remove(tournament.id);
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível excluir o torneio."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: () => Promise<any>, errorMsg: string) => {
    setActionLoading(true);
    try {
      await action();
      refetch();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, errorMsg));
    } finally {
      setActionLoading(false);
    }
  };

  const PrimaryButton = ({ label, onPress, accessLabel }: { label: string; onPress: () => void; accessLabel: string }) => (
    <Pressable onPress={onPress} disabled={actionLoading} accessibilityRole="button" accessibilityLabel={accessLabel} style={{ position: "relative" }}>
      <View style={{ width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: TC.purple, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: actionLoading ? 0.6 : 1 }}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={TC.onAccent} />
        ) : (
          <>
            <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={TC.onAccent} strokeWidth={2.6}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
          </>
        )}
      </View>
      <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
      <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: TC.bg }} />
    </Pressable>
  );

  const SecondaryButton = ({ label, onPress, accessLabel }: { label: string; onPress: () => void; accessLabel: string }) => (
    <Pressable onPress={onPress} disabled={actionLoading} accessibilityRole="button" accessibilityLabel={accessLabel} style={{ width: "100%", paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Text style={{ color: TC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</Text>
    </Pressable>
  );

  // Mesma forma do SecondaryButton, em vermelho: acao destrutiva nao deve ter o peso visual do
  // botao primario, mas precisa se distinguir das acoes neutras.
  const DangerButton = ({ label, onPress, accessLabel }: { label: string; onPress: () => void; accessLabel: string }) => (
    <Pressable onPress={onPress} disabled={actionLoading} accessibilityRole="button" accessibilityLabel={accessLabel} style={{ width: "100%", paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,77,94,0.45)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF4D5E" strokeWidth={2.2}>
        <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
      </Svg>
      <Text style={{ color: "#FF4D5E", fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</Text>
    </Pressable>
  );

  // O backend recusa excluir torneio em andamento ou concluido — o historico de partidas pertence
  // tambem aos inscritos. A tela esconde o botao nesses estados em vez de deixar o usuario tentar
  // e tomar erro.
  const podeExcluir = status !== "IN_PROGRESS" && status !== "FINISHED";

  const renderCTA = () => {
    if (!tournament) return null;
    if (isOwner) {
      switch (status) {
        case "DRAFT":
          return (
            <View style={{ gap: 10 }}>
              <PrimaryButton label="Editar torneio" accessLabel="Editar torneio" onPress={() => navigation?.navigate("CreateTournament", { tournamentId: tournament.id })} />
              <SecondaryButton label="Publicar" accessLabel="Publicar torneio" onPress={() => handleAction(() => tournamentsService.publish(tournament.id), "Não foi possível publicar.")} />
            </View>
          );
        case "PUBLISHED":
          return <PrimaryButton label="Abrir inscrições" accessLabel="Abrir inscrições" onPress={() => handleAction(() => tournamentsService.openRegistration(tournament.id), "Não foi possível abrir inscrições.")} />;
        case "REGISTRATION_OPEN":
          return (
            <PrimaryButton label="Fechar inscrições" accessLabel="Fechar inscrições" onPress={() => setConfirmAction("close")} />
          );
        case "REGISTRATION_CLOSED":
          return <PrimaryButton label="Gerar chaves" accessLabel="Gerar chaves do torneio" onPress={() => navigation?.navigate("GenerateBracket", { tournamentId: tournament.id, categories: tournament.categories ?? [] })} />;
        case "BRACKET_GENERATED": {
          const stageD = tournament.stages?.[0]?.date ?? tournament.date;
          const isToday = stageD ? new Date(stageD).toDateString() === new Date().toDateString() : false;
          return (
            <View style={{ gap: 10 }}>
              {isToday && (
                <PrimaryButton label="Iniciar torneio" accessLabel="Iniciar torneio" onPress={() => setConfirmAction("start")} />
              )}
              <SecondaryButton label="Ver chaves" accessLabel="Ver chaves do torneio" onPress={() => navigation?.navigate("Bracket", { tournamentId: tournament.id })} />
            </View>
          );
        }
        case "IN_PROGRESS":
        case "FINISHED":
          // Bracket history stays viewable after the tournament ends — the
          // organizer may still want to check past results.
          return <SecondaryButton label="Ver chaves" accessLabel="Ver chaves do torneio" onPress={() => navigation?.navigate("Bracket", { tournamentId: tournament.id })} />;
        default:
          return null;
      }
    }

    if (status === "PUBLISHED" || status === "REGISTRATION_OPEN") {
      return <PrimaryButton label="Inscrever meu time" accessLabel="Inscrever meu time" onPress={() => navigation?.navigate("Registration", { tournamentId: tournament.id, tournamentName: tournamentName, tournamentLocation: stageCity || locationStr || "" })} />;
    }

    if (status === "BRACKET_GENERATED" || status === "IN_PROGRESS" || status === "FINISHED") {
      // "Ver chaves" is the one entry point now — the bracket screen itself
      // shows the "Apitar" action per match to anyone invited as referee.
      return <PrimaryButton label="Ver chaves" accessLabel="Ver chaves do torneio" onPress={() => navigation?.navigate("Bracket", { tournamentId: tournament.id })} />;
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: TC.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={TC.lime} />}>
        {/* Hero */}
        <View style={{ position: "relative", height: 270 }}>
          <Image source={{ uri: heroImage }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
          <LinearGradient colors={["rgba(124,58,237,0.4)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.85)", "#000000"]} locations={[0, 0.35, 0.82, 1]} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <Pressable onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation.replace("MainTabs")} style={heroBtn(46, 20)}>
            <Icon name="back" size={19} color={TC.onAccent} />
          </Pressable>
          <Pressable onPress={handleShareTournament} style={{ ...heroBtn(46, 20), left: undefined, right: 20 }}>
            <Icon name="share" size={18} color={TC.onAccent} />
          </Pressable>
          <View style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
            <View style={{ marginBottom: 10, alignSelf: "flex-start" }}>
              <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
            </View>
            <Text numberOfLines={2} style={{ color: TC.onAccent, fontFamily: "Anton_400Regular", fontSize: 32, lineHeight: 32, letterSpacing: 0.4, textTransform: "uppercase" }}>{tournamentName}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          {/* Countdown banner — pointless once the tournament is already over */}
          {daysLeft != null && daysLeft >= 0 && status !== "FINISHED" && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: TC.purple, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 16, gap: 14 }}>
              {daysLeft === 0 ? (
                <>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TC.lime, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="calendar" size={20} color={TC.limeInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.5, textTransform: "uppercase" }}>É hoje!</Text>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>O torneio acontece hoje</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 44, letterSpacing: 0.5, lineHeight: 44 }}>{daysLeft}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TC.onAccent, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.4, textTransform: "uppercase", lineHeight: 20 }}>{daysLeft === 1 ? "dia" : "dias"}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>para o torneio{dateStr ? ` · ${dateStr}` : ""}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Key facts */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[
              { value: `${teamsCount}`, label: "Times", feat: false },
              { value: maxTeams != null ? `${maxTeams}` : "—", label: "Vagas", feat: true },
              { value: `${catCount}`, label: catCount === 1 ? "Categoria" : "Categorias", feat: false },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, position: "relative", backgroundColor: s.feat ? TC.purple : TC.card, borderWidth: s.feat ? 0 : 1, borderColor: TC.cardBorder, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}>
                {s.feat && <View style={{ position: "absolute", left: -8, top: "50%", marginTop: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: TC.bg }} />}
                {s.feat && <View style={{ position: "absolute", right: -8, top: "50%", marginTop: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: TC.bg }} />}
                <Text style={{ color: s.feat ? TC.onAccent : TC.lime, fontFamily: "Anton_400Regular", fontSize: 28, letterSpacing: 0.5 }}>{s.value}</Text>
                <Text style={{ color: s.feat ? "rgba(255,255,255,0.8)" : TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Num torneio de varias etapas, a data e o local acima sao da proxima etapa pendente —
              dizer qual evita o usuario achar que e a etapa 1. */}
          {totalStages > 1 && stage && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={{ backgroundColor: TC.limeTintBg, borderWidth: 1, borderColor: TC.limeTintBorder, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 }}>
                <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
                  Próxima · Etapa {stageNumber} de {totalStages}
                </Text>
              </View>
              {!!stage.name && (
                <Text numberOfLines={1} style={{ flex: 1, color: TC.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 12 }}>
                  {stage.name}
                </Text>
              )}
            </View>
          )}

          {/* Quick info chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {[
              dateStr ? { icon: "calendar" as const, text: dateStr } : null,
              stage?.startTime
                ? { icon: "clock" as const, text: formatDate(stage.startTime, { hour: "2-digit", minute: "2-digit" }) }
                : null,
              locationStr ? { icon: "location" as const, text: locationStr } : null,
            ].filter(Boolean).map((item) => (
              <View key={item!.text} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 }}>
                <Icon name={item!.icon} size={14} color={TC.purple} />
                <Text style={{ color: TC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>{item!.text}</Text>
              </View>
            ))}
          </View>

          {/* Organizer */}
          <Pressable
            onPress={organizerId ? () => navigation?.navigate("AthleteProfile", { id: organizerId }) : undefined}
            disabled={!organizerId}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 16, padding: 13, paddingHorizontal: 15, marginBottom: 20 }}
          >
            {organizerAvatar ? (
              <Image source={{ uri: organizerAvatar }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: TC.purple }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TC.purple, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 14 }}>{organizerInitials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Organizador</Text>
              <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{organizerName}</Text>
            </View>
            {organizerId ? <Icon name="chevron-right" size={16} color={TC.tx3} /> : null}
          </Pressable>

          {/* About */}
          {description ? (
            <>
              <Section label="Sobre o torneio" />
              <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, marginBottom: 20 }}>{description}</Text>
            </>
          ) : null}

          {/* Rules */}
          {rules.length > 0 && (
            <>
              <Section label="Regras" />
              <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 20, gap: 12 }}>
                {rules.map((ruleText: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: TC.purple, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 11 }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 18.5 }}>{ruleText}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <>
              <Section label={categories.length === 1 ? "Categoria" : `Categorias · ${categories.length}`} />
              <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 18, paddingHorizontal: 14, marginBottom: 20 }}>
                {categories.map((cat, i) => (
                  <View key={cat.name} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14, borderBottomWidth: i === categories.length - 1 ? 0 : 1, borderBottomColor: TC.cardBorder }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, alignItems: "center", justifyContent: "center" }}>
                      <CategoryIcon type={cat.icon} color={TC.purple} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.2, textTransform: "uppercase" }}>{cat.name}</Text>
                      <Text numberOfLines={1} style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>{cat.detail}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      {cat.price ? (
                        <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.3 }}>{cat.price}</Text>
                      ) : (
                        <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Grátis</Text>
                      )}
                      {cat.slots ? <Text style={{ color: TC.tx3, fontFamily: "Oswald_500Medium", fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 }}>{cat.slots}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Prizes */}
          {prizePot != null && prizePot > 0 && (
            <>
              <Section label="Premiação" />
              {prizeTotal && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(198,248,42,0.08)", borderWidth: 1, borderColor: "rgba(198,248,42,0.28)", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 10 }}>
                  <View>
                    <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" }}>Prêmio total</Text>
                    <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 30, letterSpacing: 0.5, marginTop: 2 }}>{prizeTotal}</Text>
                  </View>
                  <Text style={{ fontSize: 30 }}>🏆</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {PRIZES.map((p) => {
                  const tint = p.tone === "gold" ? { bg: "rgba(255,215,0,0.09)", bd: "rgba(255,215,0,0.25)" } : p.tone === "silver" ? { bg: "rgba(203,213,225,0.08)", bd: "rgba(203,213,225,0.2)" } : { bg: "rgba(205,127,50,0.09)", bd: "rgba(205,127,50,0.22)" };
                  return (
                    <View key={p.label} style={{ flex: 1, alignItems: "center", borderRadius: 14, padding: 12, backgroundColor: tint.bg, borderWidth: 1, borderColor: tint.bd }}>
                      <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                      <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 15, letterSpacing: 0.3, marginTop: 4 }}>{p.amount}</Text>
                      <Text style={{ color: TC.tx3, fontFamily: "Oswald_500Medium", fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>{p.label}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Confirmed teams — occupancy */}
          <Section label="Times confirmados" />
          {(() => {
            const pct = maxTeams && maxTeams > 0 ? Math.min(1, teamsCount / maxTeams) : 0;
            const pctLabel = maxTeams && maxTeams > 0 ? `${Math.round(pct * 100)}% preenchido` : `${teamsCount} inscrito${teamsCount === 1 ? "" : "s"}`;
            const full = maxTeams != null && teamsCount >= maxTeams && maxTeams > 0;
            return (
              <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 18, padding: 18, marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
                  <View>
                    <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>Vagas preenchidas</Text>
                    <Text style={{ color: TC.tx, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{pctLabel}</Text>
                  </View>
                  <Text style={{ fontFamily: "Anton_400Regular", fontSize: 34, letterSpacing: 0.5 }}>
                    <Text style={{ color: TC.lime }}>{teamsCount}</Text>
                    <Text style={{ color: TC.tx3 }}>{maxTeams != null ? `/${maxTeams}` : ""}</Text>
                  </Text>
                </View>

                {/* progress bar */}
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 16 }}>
                  <LinearGradient colors={full ? [TC.lime, TC.lime] : ["#8B5CF6", TC.lime]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.max(pct * 100, teamsCount > 0 ? 6 : 0)}%`, height: "100%", borderRadius: 4 }} />
                </View>

                <Pressable onPress={() => navigation?.navigate("ManageRegistrations", { tournamentId: tournament?.id })} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: teamsCount > 0 ? TC.tx : TC.tx2, fontFamily: "Manrope_600SemiBold", fontSize: 12.5 }}>
                    {teamsCount > 0 ? "Ver times inscritos" : "Seja o primeiro a se inscrever"}
                  </Text>
                  {teamsCount > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ color: TC.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Ver todos</Text>
                      <Icon name="chevron-right" size={14} color={TC.lime} />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })()}

          {/* Location */}
          <Section label="Local" />
          <Pressable
            onPress={hasLocation ? openMaps : undefined}
            disabled={!hasLocation}
            accessibilityRole={hasLocation ? "button" : undefined}
            accessibilityLabel={hasLocation ? "Abrir no mapa" : undefined}
            style={{ borderRadius: 16, overflow: "hidden", backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, marginBottom: 20 }}
          >
            <View style={{ height: 110, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center" }}>
              <LinearGradient colors={["rgba(124,58,237,0.35)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%" }} />
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: TC.limeTintBg, borderWidth: 1, borderColor: TC.limeTintBorder, alignItems: "center", justifyContent: "center" }}>
                <Icon name="location" size={26} color={TC.isDark ? TC.lime : TC.purple} />
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 15 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14, marginBottom: 3 }}>{stageAddress || locationStr || "Local a definir"}</Text>
                <Text numberOfLines={1} style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{locationStr || (hasLocation ? "" : "Endereço não informado")}</Text>
              </View>
              {hasLocation && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 }}>
                  <Icon name="external" size={14} color={TC.isDark ? TC.lime : TC.purple} />
                  <Text style={{ color: TC.tx, fontFamily: "Oswald_600SemiBold", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase" }}>Ver no mapa</Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Referee code */}
          {isOwner && status === "IN_PROGRESS" && tournament?.refereeCode && (
            <View style={{ backgroundColor: "rgba(124,58,237,0.06)", borderWidth: 1, borderColor: "rgba(139,92,246,0.2)", borderRadius: 18, padding: 16, alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Código do árbitro</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {tournament.refereeCode.split("").map((char: string, i: number) => (
                  <View key={i} style={{ width: 40, height: 46, borderRadius: 10, backgroundColor: TC.card, borderWidth: 1, borderColor: "rgba(198,248,42,0.3)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 22 }}>{char}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: TC.tx3, fontFamily: "Manrope_400Regular", fontSize: 11 }}>Compartilhe com o árbitro</Text>
            </View>
          )}

          {/* Generate referee code (in progress, no code yet) */}
          {isOwner && status === "IN_PROGRESS" && tournament && !tournament.refereeCode && (
            <Pressable
              onPress={() => handleAction(() => tournamentsService.generateRefereeCode(tournament.id), "Não foi possível gerar o código de árbitro.")}
              disabled={actionLoading}
              accessibilityRole="button" accessibilityLabel="Gerar código de árbitro"
              style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, borderRadius: 18, padding: 14, marginBottom: 20, opacity: actionLoading ? 0.6 : 1 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: TC.isDark ? "rgba(124,58,237,0.2)" : "#E2D9F9", alignItems: "center", justifyContent: "center" }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M2 8a4 4 0 014-4h1a2 2 0 012 2v2a2 2 0 01-2 2H6" stroke={TC.purple} strokeWidth={1.8} />
                  <Path d="M6 8v9a3 3 0 003 3h6a3 3 0 003-3V8" stroke={TC.purple} strokeWidth={1.8} />
                  <Path d="M18 8h1a2 2 0 002-2V4a2 2 0 00-2-2h-1a4 4 0 00-4 4" stroke={TC.purple} strokeWidth={1.8} />
                  <Circle cx={12} cy={13} r={2} stroke={TC.purple} strokeWidth={1.8} />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>Gerar código de árbitro</Text>
                <Text style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 1 }}>Um código de 6 dígitos para os árbitros</Text>
              </View>
              {actionLoading ? <ActivityIndicator size="small" color={TC.purple} /> : <Icon name="chevron-right" size={16} color={TC.tx3} />}
            </Pressable>
          )}

          {/* Referees — organizer only */}
          {isOwner && referees && referees.length > 0 && (
            <>
              <Section label="Árbitros" />
              <View style={{ gap: 10, marginBottom: 20 }}>
                {referees.map((ref: any) => (
                  <View key={ref.id ?? ref.user?.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 16, padding: 12, paddingHorizontal: 14 }}>
                    {ref.user?.avatarUrl ? (
                      <Image source={{ uri: ref.user.avatarUrl }} style={{ width: 42, height: 42, borderRadius: 13 }} />
                    ) : (
                      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 14 }}>{getOrganizerInitials(ref.user?.name)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{ref.user?.name ?? "Árbitro"}</Text>
                      <Text numberOfLines={1} style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 11.5, marginTop: 1 }}>{ref.user?.email}</Text>
                    </View>
                    <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: TC.purpleTintBg }}>
                      <Text style={{ color: TC.isDark ? "#B79BFF" : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 9.5, letterSpacing: 0.5 }}>ÁRBITRO</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* CTA — at the end of the content (not fixed) */}
          <View style={{ marginTop: 4 }}>
            {renderCTA()}

            {/* Liga e circuito acumulam pontos entre etapas; torneio unico nao tem o que somar. */}
            {tournament?.eventType !== "SINGLE" && (
              <View style={{ marginTop: 10 }}>
                <SecondaryButton
                  label="Ver classificação"
                  accessLabel="Ver classificação do torneio"
                  onPress={() => tournament && navigation?.navigate("Standings", { id: tournament.id })}
                />
              </View>
            )}

            {isOwner && tournament?.eventType !== "SINGLE" && (
              <View style={{ marginTop: 10 }}>
                <SecondaryButton
                  label="Tabela de pontos"
                  accessLabel="Editar tabela de pontos"
                  onPress={() => tournament && navigation?.navigate("PointsRules", { id: tournament.id })}
                />
              </View>
            )}

            {isOwner && podeExcluir && (
              <View style={{ marginTop: 10 }}>
                <DangerButton
                  label="Excluir torneio"
                  accessLabel="Excluir torneio"
                  onPress={() => setConfirmAction("delete")}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmAction === "close"}
        title="Fechar inscrições"
        message="Após fechar, nenhum time poderá se inscrever. Deseja continuar?"
        cancelLabel="Cancelar"
        actionLabel="Fechar"
        danger
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { setConfirmAction(null); handleAction(() => tournamentsService.closeRegistration(tournament!.id), "Não foi possível fechar inscrições."); }}
      />

      <ConfirmDialog
        visible={confirmAction === "delete"}
        title="Excluir torneio"
        message="O torneio sai da lista para todos, inclusive para quem se inscreveu. Esta ação não pode ser desfeita pelo app. Deseja continuar?"
        cancelLabel="Cancelar"
        actionLabel="Excluir"
        danger
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          handleDelete();
        }}
      />

      <ConfirmDialog
        visible={confirmAction === "start"}
        title="Iniciar torneio"
        message="O torneio será marcado como em andamento. Deseja continuar?"
        cancelLabel="Cancelar"
        actionLabel="Iniciar"
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { setConfirmAction(null); handleAction(() => tournamentsService.start(tournament!.id), "Não foi possível iniciar."); }}
      />
    </View>
  );
}

function heroBtn(top: number, left: number) {
  return {
    position: "absolute" as const, top, left,
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center" as const, justifyContent: "center" as const,
  };
}

function CategoryIcon({ type, color }: { type: "male" | "mixed"; color: string }) {
  if (type === "male") {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
        <Circle cx={10} cy={14} r={6} />
        <Path d="M15 9l5-5M16 4h4v4" />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Circle cx={9} cy={9} r={5} />
      <Circle cx={16} cy={15} r={5} />
    </Svg>
  );
}
