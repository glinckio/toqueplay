import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/hooks/useTheme";

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
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    tx3: colors.text.disabled,
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    purpleTintBorder: isDark ? "rgba(139,92,246,0.3)" : "rgba(124,58,237,0.25)",
    limeTintBg: isDark ? "rgba(198,248,42,0.16)" : "#EFF9D4",
    limeTintBorder: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.25)",
  }), [isDark, colors]);
}

interface VisitorTournament {
  status: "open" | "in_progress";
  date: string;
  name: string;
  location: string;
  enrolled: string;
}

const MOCK_TOURNAMENTS: VisitorTournament[] = [
  { status: "open", date: "25/08/2026", name: "Copa Verão Beach 2026", location: "Praia Grande, SP", enrolled: "8/16 inscritos" },
  { status: "open", date: "30/08/2026", name: "Liga Municipal Vôlei", location: "Guarujá, SP", enrolled: "12/24 inscritos" },
  { status: "in_progress", date: "15/08/2026", name: "Open de Santos", location: "Santos, SP", enrolled: "16/16 inscritos" },
];

export function VisitorHomeScreen({ navigation }: any) {
  const C = useScreenColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.3, textTransform: "uppercase" }}>
              Toque<Text style={{ color: C.lime }}>Play</Text>
            </Text>
            <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 }}>
              Descubra torneios perto de você
            </Text>
          </View>
          <Pressable style={{
            borderWidth: 1,
            borderColor: C.limeTintBorder,
            backgroundColor: C.limeTintBg,
            paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
          }}>
            <Text style={{ color: C.lime, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>Entrar</Text>
          </Pressable>
        </View>

        {/* CTA Banner */}
        <View style={{ overflow: "hidden", marginBottom: 20 }}>
          <LinearGradient
            colors={["rgba(124,58,237,0.22)", "rgba(198,248,42,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(139,92,246,0.25)" }}
          >
            <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6 }}>
              Participe de torneios!
            </Text>
            <Text style={{ color: C.tx2, fontFamily: "Manrope_400Regular", fontSize: 12.5, lineHeight: 19, marginBottom: 14 }}>
              Crie sua conta para inscrever seu time, organizar torneios e acompanhar resultados ao vivo.
            </Text>
            <Pressable style={{
              alignSelf: "flex-start",
              backgroundColor: C.purple,
              paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12,
            }}>
              <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>Criar conta grátis</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Location Banner */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: "rgba(124,58,237,0.08)",
          borderWidth: 1, borderColor: "rgba(139,92,246,0.18)",
          borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 20,
        }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(139,92,246,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="location" size={18} color={C.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>Santos, SP</Text>
            <Text style={{ color: C.tx3, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 2 }}>
              Localização em tempo real · Raio de 50 km
            </Text>
          </View>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime }} />
        </View>

        {/* Tournament List */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: C.lime }} />
          <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" }}>
            Torneios próximos
          </Text>
        </View>

        {MOCK_TOURNAMENTS.map((t, i) => (
          <TournamentCard key={i} tournament={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function TournamentCard({ tournament }: { tournament: VisitorTournament }) {
  const C = useScreenColors();
  const badgeStatus = tournament.status === "open" ? "open" : "in_progress";

  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Badge status={badgeStatus} label={tournament.status === "open" ? "INSCRIÇÕES ABERTAS" : undefined} />
        <Text style={{ color: C.tx3, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{tournament.date}</Text>
      </View>
      <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.2, textTransform: "uppercase", marginBottom: 8 }}>{tournament.name}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="location" size={12} color={C.tx3} />
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{tournament.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="users" size={12} color={C.tx3} />
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{tournament.enrolled}</Text>
        </View>
      </View>
      <Pressable style={{
        width: "100%",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "transparent",
        paddingVertical: 11, borderRadius: 12,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <Icon name="eye" size={14} color={C.tx2} />
        <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>Ver detalhes</Text>
      </Pressable>
    </View>
  );
}
