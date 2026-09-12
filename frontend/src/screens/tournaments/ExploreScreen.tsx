import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  Image as RNImage,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { RootStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApi } from "@/hooks/useApi";
import { tournamentsService } from "@/services/tournamentsService";
import * as Location from "expo-location";
import { useTC, Chip, StatusPill, FramedThumb, ScreenTitle } from "./_tournamentKit";
import { formatDate } from "@/utils/dateFormat";

// Fallback banner for tournaments without an organizer-uploaded imageUrl.
const HERO_IMAGE = RNImage.resolveAssetSource(require("@/../assets/tournament-default.png")).uri;

const FORMAT_PT: Record<string, string> = { PAIR: "Dupla", QUARTET: "Quarteto", SEXTET: "Sexteto" };
const FILTER_CHIPS = ["Todos", "Dupla", "Quarteto", "Perto de mim", "Esta semana"];

interface OpenTournament {
  id: string;
  featured?: boolean;
  image?: string;
  name: string;
  date: string;
  location: string;
  distance?: string;
  categories: string[];
  slots: string;
}

interface ClosedTournament {
  id: string;
  name: string;
  date: string;
  location: string;
  teams: string;
  category: string;
  image?: string;
}

export function ExploreScreen() {
  const TC = useTC();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeFilter, setActiveFilter] = useState(0);
  const [query, setQuery] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const refreshUserCoords = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      // Location is best-effort here (only used to sort/show distance) —
      // if services are disabled or it times out, just skip it silently.
    }
  }, []);

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const formatDistance = (km: number) => km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km)} km`;

  const { data: result, loading, error, refetch } = useApi(() => tournamentsService.explore(), []);
  useFocusEffect(useCallback(() => { refetch({ keepData: false }); refreshUserCoords(); }, [refetch, refreshUserCoords]));

  const allTournaments = result?.data ?? [];
  const openTournaments = useMemo(
    () => allTournaments.filter(t => t.status !== "FINISHED" && t.status !== "CANCELLED"),
    [allTournaments],
  );
  const closedTournaments = useMemo(
    () => allTournaments.filter(t => t.status === "FINISHED" || t.status === "CANCELLED"),
    [allTournaments],
  );

  // Featured banner goes to whichever OPEN tournament is most urgent to join
  // right now — filling up fast and/or closing registration soon — not just
  // "first in the list". Distance only breaks ties.
  const featuredId = useMemo(() => {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    let bestDistanceKm = Infinity;

    for (const t of openTournaments) {
      if (t.status !== "REGISTRATION_OPEN") continue;
      const stage = t.stages?.[0];
      const maxTeams: number | undefined = stage?.maxTeams ?? t.maxTeams;
      const registered: number = t._count?.registrations ?? 0;
      const fillRatio = maxTeams ? Math.min(1, registered / maxTeams) : 0;

      const nearestDeadline = (t.categories ?? [])
        .map((c: any) => c.registrationDeadline)
        .filter(Boolean)
        .map((d: string) => new Date(d).getTime())
        .sort((a: number, b: number) => a - b)[0];
      const daysLeft = nearestDeadline != null ? (nearestDeadline - Date.now()) / (24 * 60 * 60 * 1000) : null;
      const deadlineUrgency = daysLeft != null ? Math.max(0, Math.min(1, 1 - daysLeft / 14)) : 0;

      const score = fillRatio * 0.6 + deadlineUrgency * 0.4;

      let distanceKm = Infinity;
      if (userCoords && stage?.latitude != null && stage?.longitude != null) {
        distanceKm = haversineKm(userCoords.lat, userCoords.lng, stage.latitude, stage.longitude);
      }

      if (score > bestScore || (score === bestScore && distanceKm < bestDistanceKm)) {
        bestScore = score;
        bestId = t.id;
        bestDistanceKm = distanceKm;
      }
    }

    return bestId ?? openTournaments[0]?.id ?? null;
  }, [openTournaments, userCoords]);

  const mappedOpen: OpenTournament[] = useMemo(() => openTournaments.map((t: any) => {
    const stage = t.stages?.[0];
    const city = stage?.city ?? t.city;
    const state = stage?.state ?? t.state;
    const date = stage?.date ?? t.date;
    const maxTeams = stage?.maxTeams ?? t.maxTeams;
    const stageLat = stage?.latitude;
    const stageLng = stage?.longitude;

    let distance: string | undefined;
    if (userCoords && stageLat != null && stageLng != null) {
      distance = formatDistance(haversineKm(userCoords.lat, userCoords.lng, stageLat, stageLng));
    }

    return {
      id: t.id,
      featured: t.id === featuredId,
      image: t.imageUrl || t.coverUrl || HERO_IMAGE,
      name: t.name,
      date: date ? formatDate(date, { day: "numeric", month: "short" }) : "Sem data",
      location: city && state ? `${city}, ${state}` : "",
      distance,
      categories: t.categories?.map((c: any) => FORMAT_PT[c.format] ?? c.format) || [],
      slots: t._count?.registrations != null && maxTeams ? `${t._count.registrations}/${maxTeams} vagas` : "",
    };
  }), [openTournaments, userCoords, featuredId]);

  const mappedClosed: ClosedTournament[] = useMemo(() => closedTournaments.map((t: any) => {
    const stage = t.stages?.[0];
    const city = stage?.city ?? t.city;
    const state = stage?.state ?? t.state;
    const date = stage?.date ?? t.date;
    return {
      id: t.id,
      name: t.name,
      image: t.imageUrl || t.coverUrl || HERO_IMAGE,
      date: date ? formatDate(date, { day: "numeric", month: "short" }) : "",
      location: city && state ? `${city}, ${state}` : "",
      teams: t._count?.registrations ? `${t._count.registrations} times` : "",
      category: FORMAT_PT[t.categories?.[0]?.format] ?? t.categories?.[0]?.format ?? "",
    };
  }), [closedTournaments]);

  const filteredOpen = useMemo(() => {
    const chip = FILTER_CHIPS[activeFilter];
    const q = query.trim().toLowerCase();
    return mappedOpen.filter((t) => {
      const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
      const matchesChip =
        chip === "Todos" ||
        (chip === "Dupla" && t.categories.some(c => c === "PAIR" || c.toUpperCase().includes("DUPLA"))) ||
        (chip === "Quarteto" && t.categories.some(c => c === "QUARTET" || c.toUpperCase().includes("QUARTETO"))) ||
        (chip === "Perto de mim" && t.distance !== undefined) ||
        chip === "Esta semana";
      return matchesQuery && matchesChip;
    });
  }, [activeFilter, query, mappedOpen]);

  const goToDetail = useCallback((id: string) => navigation.navigate("TournamentDetail", { id }), [navigation]);

  if (loading && !result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Skeleton width={160} height={30} radius={8} style={{ marginBottom: 16 }} />
          <Skeleton height={50} radius={16} style={{ marginBottom: 14 }} />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            <Skeleton width={70} height={36} radius={12} />
            <Skeleton width={70} height={36} radius={12} />
            <Skeleton width={90} height={36} radius={12} />
          </View>
          <Skeleton height={200} radius={20} style={{ marginBottom: 14 }} />
          <Skeleton height={96} radius={18} style={{ marginBottom: 12 }} />
          <Skeleton height={96} radius={18} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }} edges={["top"]}>
        <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
        <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: TC.purple }}>
          <Text style={{ color: TC.onAccent, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={mappedClosed}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <ClosedCard t={item} tilt={index % 2 === 0 ? -4 : 4} onPress={goToDetail} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        // Sem isto, com o teclado da busca aberto, o primeiro toque num card so fecha o teclado.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={TC.lime} />}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              <ScreenTitle overline="Descobrir" title="Torneios" />

              {/* Search */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 14 }}>
                <Icon name="search" size={18} color={TC.tx3} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar torneio ou cidade..."
                  placeholderTextColor={TC.tx3}
                  style={{ flex: 1, color: TC.tx, fontFamily: "Manrope_500Medium", fontSize: 14, padding: 0 }}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                <Pressable onPress={() => Alert.alert("Filtros", "Filtros avançados em breve.")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Filtros avançados" style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: TC.purpleTintBg, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="sliders" size={16} color={TC.purple} />
                </Pressable>
              </View>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {FILTER_CHIPS.map((chip, i) => (
                  <Chip key={chip} label={chip} active={i === activeFilter} onPress={() => setActiveFilter(i)} />
                ))}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {/* Open */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase" }}>Inscrições abertas</Text>
                <Text style={{ color: TC.lime, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>{filteredOpen.length} torneios</Text>
              </View>

              {filteredOpen.length > 0 ? (
                <>
                  {filteredOpen.filter((t) => t.featured).map((t) => (
                    <FeaturedCard key={t.id} t={t} onPress={() => goToDetail(t.id)} />
                  ))}
                  {filteredOpen.filter((t) => !t.featured).map((t, i) => (
                    <RegularCard key={t.id} t={t} tilt={i % 2 === 0 ? -4 : 4} onPress={() => goToDetail(t.id)} />
                  ))}
                </>
              ) : (
                <EmptyBox title="Nenhum torneio aberto" body="Não há torneios com inscrições abertas no momento." />
              )}

              {/* Closed */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 14 }}>
                <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase" }}>Encerrados</Text>
              </View>

              {mappedClosed.length === 0 && (
                <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 18, padding: 20, alignItems: "center" }}>
                  <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 13, textAlign: "center" }}>Nenhum torneio encerrado.</Text>
                </View>
              )}
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

function FeaturedCard({ t, onPress }: { t: OpenTournament; onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 16 }}>
      <View style={{ height: 168, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", position: "relative" }}>
        <Image source={{ uri: t.image }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        <LinearGradient colors={["rgba(124,58,237,0.4)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.92)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}><StatusPill label="ABERTAS" tone="open" /></View>
      </View>
      <View style={{ backgroundColor: TC.card, borderWidth: 1, borderTopWidth: 0, borderColor: TC.cardBorder, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 14 }}>
        <Text numberOfLines={2} style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 22, lineHeight: 24, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 12 }}>{t.name}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <Meta icon="calendar" text={t.date} />
          {!!t.location && <Meta icon="location" text={t.location} />}
          {!!t.distance && <Meta icon="clock" text={t.distance} />}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {t.categories.map((cat, i) => (
              <View key={`${cat}-${i}`} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: TC.purpleTintBg }}>
                <Text style={{ color: TC.isDark ? "#B79BFF" : TC.purple, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>{cat}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: TC.link, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.5 }}>{t.slots}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RegularCard({ t, tilt, onPress }: { t: OpenTournament; tilt: number; onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 18, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, padding: 12, paddingRight: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={{ width: 76, alignItems: "center", justifyContent: "center" }}>
        <FramedThumb image={t.image} size={68} tilt={tilt} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.3, textTransform: "uppercase" }}>{t.name}</Text>
          <StatusPill label="ABERTAS" tone="open" />
        </View>
        <Text numberOfLines={1} style={{ color: TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
          {t.date}{t.location ? ` · ${t.location}` : ""}{t.distance ? ` · ${t.distance}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {!!t.categories[0] && (
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7, backgroundColor: TC.purpleTintBg }}>
              <Text style={{ color: TC.isDark ? "#B79BFF" : TC.purple, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" }}>{t.categories[0]}</Text>
            </View>
          )}
          <Text style={{ color: TC.link, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 0.5 }}>{t.slots}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const ClosedCard = React.memo(function ClosedCard({ t, tilt, onPress }: { t: ClosedTournament; tilt: number; onPress: (id: string) => void }) {
  const TC = useTC();
  return (
    <Pressable onPress={() => onPress(t.id)} style={{ borderRadius: 18, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, padding: 12, paddingRight: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 16, opacity: 0.72 }}>
      <View style={{ width: 76, alignItems: "center", justifyContent: "center" }}>
        <FramedThumb image={t.image} size={68} tilt={tilt} dim />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: TC.tx2, fontFamily: "Anton_400Regular", fontSize: 16, letterSpacing: 0.3, textTransform: "uppercase" }}>{t.name}</Text>
          <StatusPill label="ENCERRADO" tone="closed" />
        </View>
        <Text numberOfLines={1} style={{ color: TC.tx3, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
          {t.date}{t.location ? ` · ${t.location}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Meta icon="trophy" text={t.teams} muted />
          {!!t.category && <Text style={{ color: TC.tx3, fontFamily: "Oswald_500Medium", fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>{t.category}</Text>}
        </View>
      </View>
    </Pressable>
  );
});

function Meta({ icon, text, muted }: { icon: any; text: string; muted?: boolean }) {
  const TC = useTC();
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Icon name={icon} size={12} color={muted ? TC.tx3 : TC.purple} />
      <Text style={{ color: muted ? TC.tx3 : TC.tx2, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase" }}>{text}</Text>
    </View>
  );
}

function EmptyBox({ title, body }: { title: string; body: string }) {
  const TC = useTC();
  return (
    <View style={{ backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, borderRadius: 18, padding: 22, alignItems: "center" }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: TC.purpleTintBg, borderWidth: 1, borderColor: TC.purpleTintBorder, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Icon name="search" size={22} color={TC.purple} />
      </View>
      <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 5 }}>{title}</Text>
      <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19, textAlign: "center", maxWidth: 250 }}>{body}</Text>
    </View>
  );
}
