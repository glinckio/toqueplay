import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  const { isDark, colors } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A12" : "#F6F4FC" }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22 }}>
              ToquePlay
            </Text>
            <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 2 }}>
              Descubra torneios perto de você
            </Text>
          </View>
          <Pressable style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(198,248,42,0.3)" : "rgba(124,58,237,0.25)",
            backgroundColor: isDark ? "rgba(198,248,42,0.08)" : "rgba(124,58,237,0.06)",
            paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
          }}>
            <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>ENTRAR</Text>
          </Pressable>
        </View>

        {/* CTA Banner */}
        <View style={{ overflow: "hidden", marginBottom: 20 }}>
          <LinearGradient
            colors={isDark
              ? ["rgba(139,92,246,0.15)", "rgba(198,248,42,0.08)"]
              : ["rgba(124,58,237,0.08)", "rgba(198,248,42,0.06)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20, padding: 20,
              borderWidth: 1,
              borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(124,58,237,0.12)",
            }}
          >
            <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
              Participe de torneios!
            </Text>
            <Text style={{ color: isDark ? "#948CA8" : "#6B6480", fontFamily: "Manrope_400Regular", fontSize: 12.5, fontWeight: "400", lineHeight: 19, marginBottom: 14 }}>
              Crie sua conta para inscrever seu time, organizar torneios e acompanhar resultados ao vivo.
            </Text>
            <Pressable style={{
              alignSelf: "flex-start",
              backgroundColor: accentColor,
              paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12,
              ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 }),
            }}>
              <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>CRIAR CONTA GRÁTIS</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Location Banner */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: isDark ? "rgba(139,92,246,0.06)" : "rgba(124,58,237,0.04)",
          borderWidth: 1,
          borderColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(124,58,237,0.1)",
          borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 20,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }),
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: isDark ? "rgba(139,92,246,0.12)" : "rgba(124,58,237,0.08)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="location" size={18} color={isDark ? "#8B5CF6" : "#7C3AED"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text.primary, fontFamily: "Manrope_600SemiBold", fontSize: 13, fontWeight: "600" }}>Santos, SP</Text>
            <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_400Regular", fontSize: 11, fontWeight: "400", marginTop: 2 }}>
              Localização em tempo real · Raio de 50 km
            </Text>
          </View>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: accentColor,
            shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6,
          }} />
        </View>

        {/* Tournament List */}
        <Text style={{ color: colors.text.primary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, fontWeight: "700", marginBottom: 14 }}>
          Torneios próximos
        </Text>

        {MOCK_TOURNAMENTS.map((t, i) => (
          <TournamentCard key={i} tournament={t} isDark={isDark} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function TournamentCard({ tournament, isDark }: { tournament: VisitorTournament; isDark: boolean }) {
  const badgeStatus = tournament.status === "open" ? "open" : "in_progress";
  const metaColor = isDark ? "#6E6684" : "#8A829E";
  const metaIconColor = isDark ? "#6E6684" : "#A29CB4";

  return (
    <View style={{
      backgroundColor: isDark ? "#141019" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
      borderRadius: 18, padding: 16, marginBottom: 12,
      ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 }),
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Badge status={badgeStatus} label={tournament.status === "open" ? "INSCRIÇÕES ABERTAS" : undefined} />
        <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.date}</Text>
      </View>
      <Text style={{ color: isDark ? "#F5F3FA" : "#1A1030", fontFamily: "Manrope_600SemiBold", fontSize: 15, fontWeight: "600", marginBottom: 6 }}>{tournament.name}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="location" size={12} color={metaIconColor} />
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="users" size={12} color={metaIconColor} />
          <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>{tournament.enrolled}</Text>
        </View>
      </View>
      <Pressable style={{
        width: "100%",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.08)",
        backgroundColor: "transparent",
        paddingVertical: 11, borderRadius: 12,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <Icon name="eye" size={14} color={isDark ? "#948CA8" : "#6B6480"} />
        <Text style={{ color: isDark ? "#948CA8" : "#6B6480", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>Ver detalhes</Text>
      </Pressable>
    </View>
  );
}
