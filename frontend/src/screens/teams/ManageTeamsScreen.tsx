import React, { useState } from "react";
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
import Svg, { Path, Circle, Rect } from "react-native-svg";

interface TeamCard {
  id: string;
  name: string;
  initials: string;
  format: string;
  modality: string;
  isOwner: boolean;
  stats: { tournaments: number; wins: number; winRate: string };
  memberInitials: string[];
  memberCount: number;
}

interface PendingInvite {
  id: string;
  teamName: string;
  teamInitials: string;
  format: string;
  inviterUsername: string;
}

const MOCK_TEAMS: TeamCard[] = [
  {
    id: "team-1", name: "Silva & Rocha", initials: "SR", format: "Dupla", modality: "Areia",
    isOwner: true, stats: { tournaments: 3, wins: 2, winRate: "67%" },
    memberInitials: ["LC", "RS"], memberCount: 2,
  },
  {
    id: "team-2", name: "Vôlei Norte", initials: "VN", format: "Quarteto", modality: "Areia",
    isOwner: false, stats: { tournaments: 2, wins: 1, winRate: "50%" },
    memberInitials: ["LC", "MR", "AF", "JP"], memberCount: 4,
  },
];

const MOCK_INVITES: PendingInvite[] = [
  { id: "inv-1", teamName: "Beach Titans", teamInitials: "BT", format: "Dupla", inviterUsername: "@marcos" },
];

export function ManageTeamsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const screenBg = isDark ? "#0C0A12" : "#F7F5FC";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const labelColor = isDark ? "#6E6684" : "#9488A6";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const statBg = isDark ? "#1C1630" : "#F0ECFA";
  const statLabel = isDark ? "#6E6684" : "#9488A6";
  const avatarBg = isDark ? "#221B33" : "#F0ECFA";
  const avatarText = isDark ? "#CFC8E0" : "#7C3AED";

  const [teams] = useState(MOCK_TEAMS);
  const [invites, setInvites] = useState(MOCK_INVITES);

  const handleAcceptInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRejectInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => navigation?.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={{
                width: 40, height: 40, borderRadius: 14,
                backgroundColor: isDark ? "#171320" : "#FFFFFF",
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "rgba(26,16,48,.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 }),
              }}
            >
              <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
            </Pressable>
            <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, fontWeight: "700", letterSpacing: -0.02 * 22 }}>
              Meus times
            </Text>
          </View>
          <Pressable
            onPress={() => navigation?.navigate("CreateTeam")}
            accessibilityRole="button"
            accessibilityLabel="Criar time"
            style={{
              width: 40, height: 40, borderRadius: 14,
              backgroundColor: accentColor,
              alignItems: "center", justifyContent: "center",
              ...(isDark ? {} : { shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 4 }),
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#12100A" : "#fff"} strokeWidth={2.6}>
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ paddingHorizontal: 22 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Team cards */}
        {teams.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => navigation?.navigate("TeamDetail", { id: team.id })}
            accessibilityRole="button"
            accessibilityLabel={`Time ${team.name}`}
            style={{
              backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
              borderRadius: 20, padding: 18, marginBottom: 14,
              ...(isDark ? {} : { shadowColor: "rgba(46,16,101,.2)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 2 }),
            }}
          >
            {/* Team header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <LinearGradient
                colors={team.isOwner ? ["#8B5CF6", "#6D3BEA"] : [avatarBg, avatarBg]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: team.isOwner ? "#fff" : avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" }}>
                  {team.initials}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17, fontWeight: "700" }}>
                  {team.name}
                </Text>
                <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginTop: 2 }}>
                  {team.format} · {team.modality}
                </Text>
              </View>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2}>
                <Path d="m9 6 6 6-6 6" />
              </Svg>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {[
                { value: team.stats.tournaments, label: "Torneios" },
                { value: team.stats.wins, label: "Vitórias" },
                { value: team.stats.winRate, label: "Win rate" },
              ].map((stat) => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: statBg, borderRadius: 12, padding: 10, alignItems: "center" }}>
                  <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, fontWeight: "700" }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: statLabel, fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500" }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Members row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {team.memberInitials.map((mi, i) => (
                  <View
                    key={mi + i}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: i === 0 ? undefined : avatarBg,
                      borderWidth: 2, borderColor: cardBg,
                      alignItems: "center", justifyContent: "center",
                      marginLeft: i === 0 ? 0 : -8,
                      overflow: "hidden",
                    }}
                  >
                    {i === 0 ? (
                      <LinearGradient
                        colors={["#8B5CF6", "#6D3BEA"]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>{mi}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>{mi}</Text>
                    )}
                  </View>
                ))}
              </View>
              <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                {team.memberCount} jogadores
              </Text>
              <View style={{
                marginLeft: "auto",
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: isDark ? "rgba(198,248,42,.12)" : "#EAF7C4",
                paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7,
              }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isDark ? "#C6F82A" : "#5C7A00" }} />
                <Text style={{ color: isDark ? "#C6F82A" : "#5C7A00", fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>ATIVO</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Pending invites */}
        {invites.length > 0 && (
          <>
            <Text style={{ color: labelColor, fontFamily: "Manrope_700Bold", fontSize: 10, fontWeight: "700", letterSpacing: 0.1 * 10, marginTop: 18, marginBottom: 10 }}>
              CONVITES PENDENTES
            </Text>
            {invites.map((inv) => (
              <View
                key={inv.id}
                style={{
                  backgroundColor: isDark ? "rgba(139,92,246,.08)" : "rgba(124,58,237,.06)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(139,92,246,.2)" : "rgba(124,58,237,.15)",
                  borderRadius: 18, padding: 16, marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: avatarBg,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: avatarText, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, fontWeight: "700" }}>
                      {inv.teamInitials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: titleColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>
                      {inv.teamName}
                    </Text>
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500" }}>
                      {inv.format} · Convite de {inv.inviterUsername}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => handleAcceptInvite(inv.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Aceitar convite ${inv.teamName}`}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 12,
                      backgroundColor: accentColor,
                      alignItems: "center", justifyContent: "center",
                      ...(isDark ? {} : { shadowColor: "rgba(124,58,237,.6)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18, elevation: 4 }),
                    }}
                  >
                    <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Aceitar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleRejectInvite(inv.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Recusar convite ${inv.teamName}`}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(26,16,48,.1)",
                      backgroundColor: "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: metaColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Recusar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
