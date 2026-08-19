import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Circle, Path } from "react-native-svg";
import { RootStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApi } from "@/hooks/useApi";
import { tournamentsService } from "@/services/tournamentsService";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=720&q=68&auto=format&fit=crop";

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
}

export function ExploreScreen() {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeFilter, setActiveFilter] = useState(0);
  const [query, setQuery] = useState("");
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const metaIconColor = isDark ? "#8B5CF6" : "#7C3AED";
  const metaTextColor = isDark ? "#948CA8" : "#847B98";
  const sectionLabelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";
  const chipInactiveBg = isDark ? "#141019" : "#FFFFFF";
  const chipInactiveBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";
  const chipInactiveText = isDark ? "#948CA8" : "#847B98";
  const categoryBg = isDark ? "#1C1630" : "#F0ECFA";
  const categoryText = isDark ? "#8B5CF6" : "#7C3AED";

  const { data: result, loading, error, refetch } = useApi(() => tournamentsService.explore(), []);

  const allTournaments = result?.data ?? [];
  const openTournaments = allTournaments.filter(t => t.status === "OPEN" || t.status === "PUBLISHED" || t.status === "REGISTRATION_OPEN");
  const closedTournaments = allTournaments.filter(t => t.status === "FINISHED" || t.status === "CANCELLED");

  const mappedOpen: OpenTournament[] = openTournaments.map((t, i) => ({
    id: t.id,
    featured: i === 0,
    image: t.coverUrl || HERO_IMAGE,
    name: t.name,
    date: t.date ? new Date(t.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "Sem data",
    location: t.city && t.state ? `${t.city}, ${t.state}` : t.address || "",
    distance: undefined,
    categories: t.categories?.map(c => c.format) || [],
    slots: t._count?.registrations != null && t.maxTeams ? `${t._count.registrations}/${t.maxTeams} vagas` : "",
  }));

  const mappedClosed: ClosedTournament[] = closedTournaments.map(t => ({
    id: t.id,
    name: t.name,
    date: t.date ? new Date(t.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "",
    location: t.city && t.state ? `${t.city}, ${t.state}` : "",
    teams: t._count?.registrations ? `${t._count.registrations} times` : "",
    category: t.categories?.[0]?.format || "",
  }));

  const filteredOpen = useMemo(() => {
    const chip = FILTER_CHIPS[activeFilter];
    const q = query.trim().toLowerCase();
    return mappedOpen.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q);
      const matchesChip =
        chip === "Todos" ||
        (chip === "Dupla" && t.categories.some(c => c.toUpperCase().includes("DUPLA") || c.toUpperCase().includes("DOUBLES"))) ||
        (chip === "Quarteto" && t.categories.some(c => c.toUpperCase().includes("QUARTETO") || c.toUpperCase().includes("QUARTET"))) ||
        (chip === "Perto de mim" && t.distance !== undefined) ||
        chip === "Esta semana";
      return matchesQuery && matchesChip;
    });
  }, [activeFilter, query, mappedOpen]);

  const goToDetail = (id: string) => {
    navigation.navigate("TournamentDetail", { id });
  };

  if (loading && !result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F7F5FC", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (error && !result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F7F5FC", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }} edges={["top"]}>
        <Text style={{ color: colors.text.primary, fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={refetch} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: accentColor }}>
          <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F7F5FC" }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}
      >
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          {/* Title */}
          <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24, marginBottom: 16 }}>
            Torneios
          </Text>

          {/* Search bar */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: cardBg,
            borderWidth: 1, borderColor: cardBorder,
            borderRadius: 16, padding: 13, paddingHorizontal: 16, marginBottom: 14,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
          }}>
            <Icon name="search" size={18} color={isDark ? "#6E6684" : "#C3BCD4"} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar torneio ou cidade..."
              placeholderTextColor={isDark ? "#6E6684" : "#C3BCD4"}
              style={{ flex: 1, color: colors.text.primary, fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500", padding: 0 }}
              returnKeyType="search"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => Alert.alert("Filtros", "Filtros avançados em breve.")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Filtros avançados"
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: categoryBg,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="sliders" size={16} color={categoryText} />
            </Pressable>
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
            {FILTER_CHIPS.map((chip, i) => {
              const isActive = i === activeFilter;
              return (
                <Pressable
                  key={chip}
                  onPress={() => setActiveFilter(i)}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: isActive ? accentColor : chipInactiveBg,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: chipInactiveBorder,
                  }}
                >
                  <Text style={{
                    color: isActive ? (isDark ? "#12100A" : "#fff") : chipInactiveText,
                    fontFamily: isActive ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_600SemiBold",
                    fontSize: 12, fontWeight: isActive ? "700" : "600",
                  }}>
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 22 }}>
          {/* Section: Open */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: sectionLabelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>
              INSCRIÇÕES ABERTAS
            </Text>
            <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>
              {filteredOpen.length} torneios
            </Text>
          </View>

          {/* Featured card */}
          {filteredOpen.filter((t) => t.featured).map((t, i) => (
            <FeaturedCard key={t.id} tournament={t} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} metaIconColor={metaIconColor} metaTextColor={metaTextColor} categoryBg={categoryBg} categoryText={categoryText} accentColor={accentColor} onPress={() => goToDetail(t.id)} />
          ))}

          {/* Regular cards */}
          {filteredOpen.filter((t) => !t.featured).map((t, i) => (
            <RegularCard key={t.id} tournament={t} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} metaTextColor={metaTextColor} categoryBg={categoryBg} categoryText={categoryText} accentColor={accentColor} onPress={() => goToDetail(t.id)} />
          ))}

          {/* Section: Closed */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 12 }}>
            <Text style={{ color: sectionLabelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10 }}>
              ENCERRADOS
            </Text>
            <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>
              Ver todos →
            </Text>
          </View>

          {mappedClosed.map((t) => (
            <ClosedCard key={t.id} tournament={t} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VolleyballIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </Svg>
  );
}

function FeaturedCard({ tournament, isDark, cardBg, cardBorder, metaIconColor, metaTextColor, categoryBg, categoryText, accentColor, onPress }: {
  tournament: OpenTournament; isDark: boolean; cardBg: string; cardBorder: string; metaIconColor: string; metaTextColor: string; categoryBg: string; categoryText: string; accentColor: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{
      borderRadius: 20, overflow: "hidden", marginBottom: 14,
      backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
      ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.25)", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 26, elevation: 6 }),
    }}>
      {/* Image */}
      <View style={{ position: "relative", height: 120 }}>
        <Image source={{ uri: tournament.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient
          colors={isDark ? ["transparent", "rgba(20,16,25,0.9)"] : ["transparent", "rgba(255,255,255,0.85)"]}
          locations={[0.3, 1]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        {/* Badge */}
        <View style={{
          position: "absolute", top: 10, right: 10,
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: isDark ? "rgba(198,248,42,0.18)" : "rgba(92,122,0,0.15)",
          paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
        }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isDark ? "#C6F82A" : "#5C7A00" }} />
          <Text style={{ color: isDark ? "#C6F82A" : "#5C7A00", fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700", letterSpacing: 0.04 * 9 }}>ABERTAS</Text>
        </View>
        {/* Title overlay */}
        <View style={{ position: "absolute", bottom: 10, left: 14 }}>
          <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700" }}>{tournament.name}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={{ padding: 12, paddingHorizontal: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="calendar" size={12} color={metaIconColor} />
            <Text style={{ color: metaTextColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.date}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="location" size={12} color={metaIconColor} />
            <Text style={{ color: metaTextColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.location}</Text>
          </View>
          {tournament.distance && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={12} color={metaIconColor} />
              <Text style={{ color: metaTextColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.distance}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {tournament.categories.map((cat) => (
              <View key={cat} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: categoryBg }}>
                <Text style={{ color: categoryText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{cat}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>{tournament.slots}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RegularCard({ tournament, isDark, cardBg, cardBorder, metaTextColor, categoryBg, categoryText, accentColor, onPress }: {
  tournament: OpenTournament; isDark: boolean; cardBg: string; cardBorder: string; metaTextColor: string; categoryBg: string; categoryText: string; accentColor: string; onPress: () => void;
}) {
  const iconBgFallback = isDark ? "#2A2048" : "#F0ECFA";
  const iconColor = isDark ? "#8B5CF6" : "#7C3AED";

  return (
    <Pressable onPress={onPress} style={{
      borderRadius: 18, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
      padding: 14, marginBottom: 12, flexDirection: "row", gap: 14,
      ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.18)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
    }}>
      <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: iconBgFallback, alignItems: "center", justifyContent: "center" }}>
        <VolleyballIcon size={28} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>{tournament.name}</Text>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8,
            backgroundColor: isDark ? "rgba(198,248,42,0.14)" : "rgba(92,122,0,0.12)",
            paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6,
          }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isDark ? "#C6F82A" : "#5C7A00" }} />
            <Text style={{ color: isDark ? "#C6F82A" : "#5C7A00", fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>ABERTAS</Text>
          </View>
        </View>
        <Text style={{ color: metaTextColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginBottom: 6 }}>
          {tournament.date} · {tournament.location}{tournament.distance ? ` · ${tournament.distance}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: categoryBg }}>
            <Text style={{ color: categoryText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>{tournament.categories[0]}</Text>
          </View>
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700" }}>{tournament.slots}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ClosedCard({ tournament, isDark, cardBg, cardBorder }: {
  tournament: ClosedTournament; isDark: boolean; cardBg: string; cardBorder: string;
}) {
  const nameColor = isDark ? "#948CA8" : "#847B98";
  const metaColor = isDark ? "#6E6684" : "#C3BCD4";
  const iconColor = isDark ? "#3A3350" : "#C3BCD4";
  const badgeBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)";
  const badgeText = isDark ? "#6E6684" : "#9488A6";
  const dotColor = isDark ? "#3A3350" : "#DFD7EE";

  return (
    <View style={{
      borderRadius: 18, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
      padding: 14, marginBottom: 12, flexDirection: "row", gap: 14, opacity: isDark ? 0.7 : 0.6,
      ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.12)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
    }}>
      <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: isDark ? "#1C1630" : "#F0ECFA", alignItems: "center", justifyContent: "center" }}>
        <VolleyballIcon size={28} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: nameColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>{tournament.name}</Text>
          <View style={{ backgroundColor: badgeBg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginLeft: 8 }}>
            <Text style={{ color: badgeText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>ENCERRADO</Text>
          </View>
        </View>
        <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginBottom: 6 }}>
          {tournament.date} · {tournament.location}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="trophy" size={12} color={metaColor} />
            <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{tournament.teams}</Text>
          </View>
          <Text style={{ color: dotColor }}>·</Text>
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{tournament.category}</Text>
        </View>
      </View>
    </View>
  );
}
