import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import Svg, { Circle, Path } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { tournamentsService } from "@/services/tournamentsService";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=720&q=68&auto=format&fit=crop";

const PRIZES = [
  { emoji: "\u{1F947}", amount: "R$ 500", label: "1º lugar", gold: true },
  { emoji: "\u{1F948}", amount: "R$ 250", label: "2º lugar" },
  { emoji: "\u{1F949}", amount: "R$ 100", label: "3º lugar" },
];

function getStatusLabel(status: string | undefined): { label: string; open: boolean } {
  switch (status) {
    case "PUBLISHED":
    case "REGISTRATION_OPEN":
      return { label: "INSCRIÇÕES ABERTAS", open: true };
    case "REGISTRATION_CLOSED":
      return { label: "INSCRIÇÕES ENCERRADAS", open: false };
    case "BRACKET_GENERATED":
    case "IN_PROGRESS":
      return { label: "EM ANDAMENTO", open: false };
    case "FINISHED":
      return { label: "ENCERRADO", open: false };
    case "DRAFT":
      return { label: "RASCUNHO", open: false };
    case "CANCELLED":
      return { label: "CANCELADO", open: false };
    default:
      return { label: "INSCRIÇÕES ABERTAS", open: true };
  }
}

function getOrganizerInitials(name: string | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TournamentDetailScreen({ navigation, route }: any) {
  const { isDark, colors } = useTheme();
  const id = route?.params?.id;
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";
  const sectionLabel = isDark ? "#6E6684" : "#9488A6";
  const bodyText = isDark ? "#A9A2BC" : "#6B6480";
  const metaIcon = isDark ? "#8B5CF6" : "#7C3AED";
  const ruleBg = isDark ? "#1C1630" : "#F0ECFA";
  const ruleText = isDark ? "#8B5CF6" : "#7C3AED";
  const bgBase = isDark ? "#0C0A12" : "#F7F5FC";

  const { data: tournament, loading, error, refetch } = useApi(
    () => tournamentsService.findOne(id),
    [id],
  );

  if (loading && !tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: bgBase, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  if (error && !tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: bgBase, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 }}>
        <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_500Medium", fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={refetch} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: accentColor }}>
          <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const statusInfo = getStatusLabel(tournament?.status);
  const heroImage = tournament?.coverUrl || HERO_IMAGE;
  const tournamentName = tournament?.name ?? "Torneio";
  const organizerName = tournament?.organizer?.name ?? "Organizador";
  const organizerInitials = getOrganizerInitials(tournament?.organizer?.name);
  const description = tournament?.description;
  const dateStr = tournament?.date
    ? new Date(tournament.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const locationStr = tournament?.city && tournament?.state
    ? `${tournament.city}, ${tournament.state}`
    : tournament?.address || null;

  const rules = tournament?.rules
    ? tournament.rules.split("\n").filter((r: string) => r.trim().length > 0)
    : [];

  const categories = (tournament?.categories ?? []).map(cat => ({
    icon: (cat.format?.toUpperCase().includes("MIST") ? "mixed" : "male") as "male" | "mixed",
    name: cat.name,
    detail: `${cat.format} · ${cat.type ?? ""}`.trim(),
    slots: cat.maxTeams ? `${cat.maxTeams} vagas` : "",
  }));

  const prizePot = tournament?.prizePot;

  return (
    <View style={{ flex: 1, backgroundColor: bgBase }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={accentColor} />}
      >
        {/* Hero banner */}
        <View style={{ position: "relative", height: 190 }}>
          <Image source={{ uri: heroImage }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={isDark
              ? ["rgba(12,10,18,0.3)", "rgba(12,10,18,0)", "rgba(12,10,18,0.85)", "#0C0A12"]
              : ["rgba(26,20,40,0.25)", "rgba(26,20,40,0)", "rgba(247,245,252,0.85)", "#F7F5FC"]
            }
            locations={[0, 0.3, 0.8, 1]}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />
          {/* Back button */}
          <Pressable
            onPress={() => navigation?.goBack()}
            style={{
              position: "absolute", top: 46, left: 20,
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)",
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(26,16,48,0.08)",
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(26,16,48,0.3)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 }),
            }}
          >
            <Icon name="back" size={19} color={isDark ? "#fff" : "#4A4460"} />
          </Pressable>
          {/* Share button */}
          <Pressable style={{
            position: "absolute", top: 46, right: 20,
            width: 40, height: 40, borderRadius: 14,
            backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(26,16,48,0.08)",
            alignItems: "center", justifyContent: "center",
            ...(isDark ? {} : { shadowColor: "rgba(26,16,48,0.3)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 }),
          }}>
            <Icon name="share" size={18} color={isDark ? "#fff" : "#4A4460"} />
          </Pressable>
          {/* Badge + title */}
          <View style={{ position: "absolute", bottom: 14, left: 22, right: 22 }}>
            <View style={{
              alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: statusInfo.open
                ? (isDark ? "rgba(198,248,42,0.18)" : "rgba(92,122,0,0.14)")
                : (isDark ? "rgba(110,102,132,0.15)" : "rgba(26,16,48,0.06)"),
              paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginBottom: 8,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.open ? (isDark ? "#C6F82A" : "#5C7A00") : (isDark ? "#6E6684" : "#9488A6") }} />
              <Text style={{ color: statusInfo.open ? (isDark ? "#C6F82A" : "#5C7A00") : (isDark ? "#948CA8" : "#8A829E"), fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.04 * 10 }}>{statusInfo.label}</Text>
            </View>
            <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, fontWeight: "700", letterSpacing: -0.02 * 24, lineHeight: 26 }}>{tournamentName}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22 }}>
          {/* Quick info chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {[
              dateStr ? { icon: "calendar" as const, text: dateStr } : null,
              locationStr ? { icon: "location" as const, text: locationStr } : null,
            ].filter(Boolean).map((item) => (
              <View key={item!.text} style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
              }}>
                <Icon name={item!.icon} size={14} color={metaIcon} />
                <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600" }}>{item!.text}</Text>
              </View>
            ))}
          </View>

          {/* Organizer */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
            borderRadius: 16, padding: 13, paddingHorizontal: 15, marginBottom: 18,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
          }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>{organizerInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: isDark ? "#948CA8" : "#847B98", fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>Organizador</Text>
              <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700" }}>{organizerName}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={isDark ? "#6E6684" : "#C3BCD4"} />
          </View>

          {/* About */}
          {description ? (
            <>
              <SectionLabel text="SOBRE O TORNEIO" color={sectionLabel} />
              <Text style={{ color: bodyText, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 20.8, marginBottom: 18 }}>
                {description}
              </Text>
            </>
          ) : null}

          {/* Rules */}
          {rules.length > 0 && (
            <>
              <SectionLabel text="REGRAS" color={sectionLabel} />
              <View style={{
                backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 18, gap: 10,
                ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
              }}>
                {rules.map((ruleText: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: ruleBg, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <Text style={{ color: ruleText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, fontWeight: "700" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, color: bodyText, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", lineHeight: 18 }}>{ruleText}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <>
              <SectionLabel text="CATEGORIAS" color={sectionLabel} />
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
                {categories.map((cat) => (
                  <View key={cat.name} style={{
                    flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                    borderRadius: 16, padding: 14, alignItems: "center",
                    ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
                  }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: ruleBg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <CategoryIcon type={cat.icon} color={metaIcon} />
                    </View>
                    <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>{cat.name}</Text>
                    <Text style={{ color: isDark ? "#948CA8" : "#847B98", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 2 }}>{cat.detail}</Text>
                    {cat.slots ? <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700", marginTop: 8 }}>{cat.slots}</Text> : null}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Prizes */}
          {prizePot != null && prizePot > 0 && (
            <>
              <SectionLabel text="PREMIAÇÃO" color={sectionLabel} />
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
                {PRIZES.map((p) => (
                  <View key={p.label} style={{
                    flex: 1, alignItems: "center", borderRadius: 14, padding: 12,
                    backgroundColor: p.gold
                      ? (isDark ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.06)")
                      : (isDark ? "rgba(192,192,192,0.06)" : "rgba(192,192,192,0.08)"),
                    borderWidth: 1,
                    borderColor: p.gold
                      ? "rgba(255,215,0,0.2)"
                      : (p.label === "2º lugar" ? "rgba(192,192,192,0.15)" : "rgba(205,127,50,0.15)"),
                  }}>
                    <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                    <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700", marginTop: 4 }}>{p.amount}</Text>
                    <Text style={{ color: isDark ? "#6E6684" : "#9488A6", fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Confirmed teams - no data from findOne, show placeholder */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionLabel text="TIMES CONFIRMADOS" color={sectionLabel} inline />
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600" }}>Ver todos →</Text>
          </View>
          <View style={{ gap: 10, marginBottom: 18 }}>
            <Text style={{ color: bodyText, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
              {tournament?._count?.registrations
                ? `${tournament._count.registrations} time(s) inscrito(s)`
                : "Nenhum time inscrito ainda"}
            </Text>
          </View>

          {/* Location */}
          <SectionLabel text="LOCAL" color={sectionLabel} />
          <View style={{
            borderRadius: 16, overflow: "hidden", backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, marginBottom: 20,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.2)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
          }}>
            <View style={{ height: 100, backgroundColor: isDark ? "#1C1630" : "#EDE8F6", alignItems: "center", justifyContent: "center" }}>
              <Icon name="location" size={40} color={isDark ? "#3A3350" : "#C3BCD4"} />
            </View>
            <View style={{ padding: 13, paddingHorizontal: 15 }}>
              <Text style={{ color: isDark ? "#F5F3FA" : "#1A1428", fontFamily: "Manrope_700Bold", fontSize: 14, fontWeight: "700", marginBottom: 3 }}>
                {tournament?.address || locationStr || "Local a definir"}
              </Text>
              <Text style={{ color: isDark ? "#948CA8" : "#847B98", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>
                {locationStr || ""}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <LinearGradient
        colors={isDark ? ["rgba(12,10,18,0)", bgBase] : ["rgba(247,245,252,0)", bgBase]}
        locations={[0, 0.32]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 26 }}
      >
        <Pressable
          onPress={() => navigation?.navigate("Registration", {
            tournamentId: tournament?.id ?? route?.params?.id ?? "",
            tournamentName: tournamentName,
            tournamentLocation: tournament?.city || locationStr || "",
          })}
          accessibilityRole="button"
          accessibilityLabel="Inscrever meu time"
          style={{
          width: "100%", paddingVertical: 17, borderRadius: 18,
          backgroundColor: accentColor,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
        }}>
          <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700", letterSpacing: 0.02 * 15 }}>Inscrever meu time</Text>
          <Icon name="chevron-right" size={16} color={isDark ? "#12100A" : "#fff"} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function SectionLabel({ text, color, inline }: { text: string; color: string; inline?: boolean }) {
  return (
    <Text style={{ color, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginBottom: inline ? 0 : 10 }}>
      {text}
    </Text>
  );
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
