import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { tournamentsService } from "@/services/tournamentsService";
import { getErrorMessage, api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { BracketType } from "@/types/enums";
import { useTheme } from "@/hooks/useTheme";

// Practical minimums so brackets don't produce degenerate/pointless structures
// (matches backend MIN_TEAMS_BY_BRACKET_TYPE in brackets.service.ts).
const MIN_TEAMS_BY_TYPE: Record<BracketType, number> = {
  [BracketType.SINGLE_ELIMINATION]: 3,
  [BracketType.DOUBLE_ELIMINATION]: 4,
  [BracketType.ROUND_ROBIN]: 3,
  [BracketType.GROUPS_THEN_ELIMINATION]: 4,
};

function disabledReason(type: BracketType, confirmedTeams: number): string | null {
  const min = MIN_TEAMS_BY_TYPE[type];
  if (confirmedTeams < min) return `Mínimo ${min} times confirmados (você tem ${confirmedTeams})`;
  return null;
}

interface BracketOption {
  type: BracketType;
  label: string;
  subtitle: string;
  description: string;
  example: string;
  iconColor: string;
  stats: { value: string; label: string }[];
  tagline: string;
}

const BRACKET_OPTIONS: BracketOption[] = [
  {
    type: BracketType.SINGLE_ELIMINATION,
    label: "Eliminatória Simples",
    subtitle: "Perdeu, saiu",
    description:
      "Cada time joga uma vez por rodada. O perdedor é eliminado imediatamente. O vencedor avança até a final. Formato mais rápido e direto.",
    example:
      "8 times → 4 jogos (quartas) → 2 jogos (semis) → 1 jogo (final). Total: 7 jogos.",
    iconColor: "#C6F82A",
    tagline: "O mais rápido e direto",
    stats: [
      { value: "8", label: "times" },
      { value: "7", label: "jogos" },
      { value: "3", label: "rodadas" },
    ],
  },
  {
    type: BracketType.DOUBLE_ELIMINATION,
    label: "Eliminatória Dupla",
    subtitle: "Duas chances",
    description:
      "Cada time precisa perder duas vezes para ser eliminado. Quem perde na chave principal vai para a chave de repescagem. Os vencedores de cada chave se enfrentam na grande final.",
    example:
      "8 times → Chave principal + Chave de repescagem → Grande Final. Mais jogos, mais emoção.",
    iconColor: "#8B5CF6",
    tagline: "Ninguém sai por um erro só",
    stats: [
      { value: "8", label: "times" },
      { value: "~14", label: "jogos" },
      { value: "2", label: "chances" },
    ],
  },
  {
    type: BracketType.ROUND_ROBIN,
    label: "Todos contra Todos",
    subtitle: "Pontos corridos",
    description:
      "Cada time enfrenta todos os outros. Ao final, os times são classificados por vitórias, saldo de pontos e pontos marcados. Os melhores vão para semifinal e final.",
    example:
      "6 times → 15 jogos na fase de grupos → Semifinais → Final + 3º lugar.",
    iconColor: "#F59E0B",
    tagline: "Todos jogam contra todos",
    stats: [
      { value: "6", label: "times" },
      { value: "15", label: "jogos" },
      { value: "1", label: "turno" },
    ],
  },
  {
    type: BracketType.GROUPS_THEN_ELIMINATION,
    label: "Grupos + Eliminatória",
    subtitle: "Fase de grupos → mata-mata",
    description:
      "Times são divididos em grupos e jogam todos contra todos dentro do grupo. Os melhores de cada grupo avançam para uma fase eliminatória (mata-mata).",
    example:
      "12 times → 3 grupos de 4 → Top 2 de cada grupo → Eliminatória com 6 times.",
    iconColor: "#EC4899",
    tagline: "Grupos e depois o mata-mata",
    stats: [
      { value: "12", label: "times" },
      { value: "3", label: "grupos" },
      { value: "6", label: "no mata-mata" },
    ],
  },
];

function BracketTypeIcon({ type, color, size = 32 }: { type: BracketType; color: string; size?: number }) {
  const s = size;
  if (type === BracketType.SINGLE_ELIMINATION) {
    return (
      <Svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <Line x1={4} y1={6} x2={14} y2={6} stroke={color} strokeWidth={2} />
        <Line x1={4} y1={14} x2={14} y2={14} stroke={color} strokeWidth={2} />
        <Line x1={14} y1={6} x2={14} y2={14} stroke={color} strokeWidth={2} />
        <Line x1={14} y1={10} x2={22} y2={10} stroke={color} strokeWidth={2} />
        <Line x1={4} y1={20} x2={14} y2={20} stroke={color} strokeWidth={2} />
        <Line x1={4} y1={28} x2={14} y2={28} stroke={color} strokeWidth={2} />
        <Line x1={14} y1={20} x2={14} y2={28} stroke={color} strokeWidth={2} />
        <Line x1={14} y1={24} x2={22} y2={24} stroke={color} strokeWidth={2} />
        <Line x1={22} y1={10} x2={22} y2={24} stroke={color} strokeWidth={2} />
        <Line x1={22} y1={17} x2={28} y2={17} stroke={color} strokeWidth={2} />
        <Circle cx={28} cy={17} r={2.5} fill={color} />
      </Svg>
    );
  }
  if (type === BracketType.DOUBLE_ELIMINATION) {
    return (
      <Svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <Line x1={3} y1={4} x2={10} y2={4} stroke={color} strokeWidth={1.8} />
        <Line x1={3} y1={10} x2={10} y2={10} stroke={color} strokeWidth={1.8} />
        <Line x1={10} y1={4} x2={10} y2={10} stroke={color} strokeWidth={1.8} />
        <Line x1={10} y1={7} x2={17} y2={7} stroke={color} strokeWidth={1.8} />
        <Line x1={17} y1={7} x2={17} y2={13} stroke={color} strokeWidth={1.8} />
        <Line x1={17} y1={13} x2={24} y2={13} stroke={color} strokeWidth={1.8} />
        <Line x1={3} y1={20} x2={10} y2={20} stroke={color} strokeWidth={1.8} strokeDasharray="3,2" />
        <Line x1={3} y1={26} x2={10} y2={26} stroke={color} strokeWidth={1.8} strokeDasharray="3,2" />
        <Line x1={10} y1={20} x2={10} y2={26} stroke={color} strokeWidth={1.8} strokeDasharray="3,2" />
        <Line x1={10} y1={23} x2={17} y2={23} stroke={color} strokeWidth={1.8} strokeDasharray="3,2" />
        <Line x1={17} y1={13} x2={17} y2={23} stroke={color} strokeWidth={1.8} />
        <Line x1={24} y1={13} x2={24} y2={18} stroke={color} strokeWidth={1.8} />
        <Circle cx={27} cy={15} r={2.5} fill={color} />
      </Svg>
    );
  }
  if (type === BracketType.ROUND_ROBIN) {
    return (
      <Svg width={s} height={s} viewBox="0 0 32 32" fill="none">
        <Circle cx={16} cy={6} r={3} stroke={color} strokeWidth={1.8} fill="none" />
        <Circle cx={26} cy={16} r={3} stroke={color} strokeWidth={1.8} fill="none" />
        <Circle cx={22} cy={27} r={3} stroke={color} strokeWidth={1.8} fill="none" />
        <Circle cx={10} cy={27} r={3} stroke={color} strokeWidth={1.8} fill="none" />
        <Circle cx={6} cy={16} r={3} stroke={color} strokeWidth={1.8} fill="none" />
        <Line x1={16} y1={9} x2={23} y2={14} stroke={color} strokeWidth={1.2} opacity={0.5} />
        <Line x1={16} y1={9} x2={9} y2={14} stroke={color} strokeWidth={1.2} opacity={0.5} />
        <Line x1={23} y1={19} x2={22} y2={24} stroke={color} strokeWidth={1.2} opacity={0.5} />
        <Line x1={9} y1={19} x2={10} y2={24} stroke={color} strokeWidth={1.2} opacity={0.5} />
        <Line x1={13} y1={27} x2={19} y2={27} stroke={color} strokeWidth={1.2} opacity={0.5} />
        <Line x1={16} y1={9} x2={22} y2={24} stroke={color} strokeWidth={1.2} opacity={0.3} />
        <Line x1={16} y1={9} x2={10} y2={24} stroke={color} strokeWidth={1.2} opacity={0.3} />
        <Line x1={9} y1={14} x2={22} y2={24} stroke={color} strokeWidth={1.2} opacity={0.3} />
        <Line x1={23} y1={14} x2={10} y2={24} stroke={color} strokeWidth={1.2} opacity={0.3} />
      </Svg>
    );
  }
  // GROUPS_THEN_ELIMINATION
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <Rect x={2} y={2} width={12} height={12} rx={3} stroke={color} strokeWidth={1.5} fill="none" />
      <Rect x={18} y={2} width={12} height={12} rx={3} stroke={color} strokeWidth={1.5} fill="none" />
      <Line x1={5} y1={6} x2={11} y2={6} stroke={color} strokeWidth={1.2} opacity={0.5} />
      <Line x1={5} y1={9} x2={11} y2={9} stroke={color} strokeWidth={1.2} opacity={0.5} />
      <Line x1={21} y1={6} x2={27} y2={6} stroke={color} strokeWidth={1.2} opacity={0.5} />
      <Line x1={21} y1={9} x2={27} y2={9} stroke={color} strokeWidth={1.2} opacity={0.5} />
      <Line x1={8} y1={14} x2={8} y2={19} stroke={color} strokeWidth={1.5} />
      <Line x1={24} y1={14} x2={24} y2={19} stroke={color} strokeWidth={1.5} />
      <Path d="M8 19 L8 22 L24 22 L24 19" stroke={color} strokeWidth={1.5} fill="none" />
      <Line x1={16} y1={22} x2={16} y2={26} stroke={color} strokeWidth={1.5} />
      <Circle cx={16} cy={28} r={2} fill={color} />
    </Svg>
  );
}

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
    purpleTintBg: isDark ? "rgba(124,58,237,0.16)" : "#EDE7FB",
    // Always white — sits on a solid purple/lime fill, not the card bg, so
    // it must NOT flip with theme like regular text does.
    onAccent: "#FFFFFF",
    // Lime nearly disappears on a white card in light mode — links/"ver
    // todos" swap to purple there, dark mode keeps the lime accent.
    link: isDark ? "#C6F82A" : "#7C3AED",
  }), [isDark, colors]);
}

const LINE = "rgba(255,255,255,0.18)";
const NODE = "rgba(255,255,255,0.35)";

function FormatPreview({ type, color }: { type: BracketType; color: string }) {
  // Clean mini-schematic of each bracket format. viewBox 0 0 120 56.
  if (type === BracketType.SINGLE_ELIMINATION) {
    return (
      <Svg width="100%" height={58} viewBox="0 0 120 56" fill="none">
        {/* round 1 → 2 */}
        <Line x1={8} y1={8} x2={26} y2={8} stroke={LINE} strokeWidth={1.5} />
        <Line x1={8} y1={20} x2={26} y2={20} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={8} x2={26} y2={20} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={14} x2={40} y2={14} stroke={LINE} strokeWidth={1.5} />
        <Line x1={8} y1={36} x2={26} y2={36} stroke={LINE} strokeWidth={1.5} />
        <Line x1={8} y1={48} x2={26} y2={48} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={36} x2={26} y2={48} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={42} x2={40} y2={42} stroke={LINE} strokeWidth={1.5} />
        {/* round 2 → final */}
        <Line x1={40} y1={14} x2={40} y2={42} stroke={LINE} strokeWidth={1.5} />
        <Line x1={40} y1={28} x2={92} y2={28} stroke={LINE} strokeWidth={1.5} />
        {[8, 20, 36, 48].map((y) => <Circle key={y} cx={8} cy={y} r={3} fill={color} />)}
        <Circle cx={40} cy={14} r={2.5} fill={NODE} />
        <Circle cx={40} cy={42} r={2.5} fill={NODE} />
        <Circle cx={99} cy={28} r={6} fill="#C6F82A" />
      </Svg>
    );
  }
  if (type === BracketType.DOUBLE_ELIMINATION) {
    return (
      <Svg width="100%" height={58} viewBox="0 0 120 56" fill="none">
        {/* winners bracket */}
        <Line x1={8} y1={8} x2={26} y2={8} stroke={LINE} strokeWidth={1.5} />
        <Line x1={8} y1={18} x2={26} y2={18} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={8} x2={26} y2={18} stroke={LINE} strokeWidth={1.5} />
        <Line x1={26} y1={13} x2={56} y2={13} stroke={LINE} strokeWidth={1.5} />
        {/* losers bracket (dashed) */}
        <Line x1={8} y1={38} x2={26} y2={38} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
        <Line x1={8} y1={48} x2={26} y2={48} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
        <Line x1={26} y1={38} x2={26} y2={48} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
        <Line x1={26} y1={43} x2={56} y2={43} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.7} />
        {/* grand final */}
        <Line x1={56} y1={13} x2={56} y2={43} stroke={LINE} strokeWidth={1.5} />
        <Line x1={56} y1={28} x2={92} y2={28} stroke={LINE} strokeWidth={1.5} />
        {[8, 18].map((y) => <Circle key={y} cx={8} cy={y} r={3} fill={color} />)}
        {[38, 48].map((y) => <Circle key={y} cx={8} cy={y} r={3} fill={color} opacity={0.6} />)}
        <Circle cx={99} cy={28} r={6} fill="#C6F82A" />
      </Svg>
    );
  }
  if (type === BracketType.ROUND_ROBIN) {
    // pentagon mesh → champion
    const pts = [[26, 8], [46, 22], [39, 46], [13, 46], [6, 22]];
    return (
      <Svg width="100%" height={58} viewBox="0 0 120 56" fill="none">
        {pts.map((a, i) => pts.slice(i + 1).map((b, j) => (
          <Line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={LINE} strokeWidth={1} />
        )))}
        {pts.map((p, i) => <Circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={color} />)}
        <Line x1={52} y1={28} x2={92} y2={28} stroke={LINE} strokeWidth={1.5} />
        <Circle cx={99} cy={28} r={6} fill="#C6F82A" />
      </Svg>
    );
  }
  // GROUPS_THEN_ELIMINATION
  return (
    <Svg width="100%" height={58} viewBox="0 0 120 56" fill="none">
      {[6, 24, 42].map((y, i) => (
        <React.Fragment key={y}>
          <Rect x={6} y={y} width={30} height={12} rx={3} stroke={color} strokeWidth={1.4} fill={`${color}18`} />
          <Line x1={36} y1={y + 6} x2={58} y2={28} stroke={LINE} strokeWidth={1.3} opacity={i === 1 ? 1 : 0.6} />
        </React.Fragment>
      ))}
      <Line x1={58} y1={28} x2={70} y2={28} stroke={LINE} strokeWidth={1.5} />
      <Line x1={70} y1={18} x2={70} y2={38} stroke={LINE} strokeWidth={1.5} />
      <Line x1={70} y1={18} x2={82} y2={18} stroke={LINE} strokeWidth={1.5} />
      <Line x1={70} y1={38} x2={82} y2={38} stroke={LINE} strokeWidth={1.5} />
      <Line x1={86} y1={18} x2={86} y2={38} stroke={LINE} strokeWidth={1.5} />
      <Line x1={86} y1={28} x2={94} y2={28} stroke={LINE} strokeWidth={1.5} />
      <Circle cx={100} cy={28} r={5.5} fill="#C6F82A" />
    </Svg>
  );
}

function GroupsCountPicker({
  mode, setMode, count, setCount, maxGroups, totalTeams,
}: {
  mode: "auto" | "manual";
  setMode: (m: "auto" | "manual") => void;
  count: number;
  setCount: (c: number) => void;
  maxGroups: number;
  totalTeams: number;
}) {
  const C = useScreenColors();
  const base = Math.floor(totalTeams / count);
  const remainder = totalTeams % count;
  const sizesLabel = remainder === 0
    ? `${count} grupos de ${base} times`
    : `${remainder} grupo${remainder > 1 ? "s" : ""} de ${base + 1} + ${count - remainder} de ${base}`;

  return (
    <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ color: C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
        Número de grupos
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: mode === "manual" ? 12 : 0 }}>
        {(["auto", "manual"] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityLabel={m === "auto" ? "Automático" : "Escolher manualmente"}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                backgroundColor: active ? C.purple : "rgba(255,255,255,0.05)",
                borderWidth: active ? 0 : 1, borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text style={{ color: active ? "#fff" : C.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {m === "auto" ? "Automático" : "Escolher"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "manual" && (
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Pressable
              onPress={() => setCount(Math.max(2, count - 1))}
              disabled={count <= 2}
              accessibilityRole="button"
              accessibilityLabel="Diminuir número de grupos"
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", opacity: count <= 2 ? 0.4 : 1 }}
            >
              <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 18 }}>−</Text>
            </Pressable>
            <Text style={{ color: C.lime, fontFamily: "Anton_400Regular", fontSize: 28, minWidth: 40, textAlign: "center" }}>{count}</Text>
            <Pressable
              onPress={() => setCount(Math.min(maxGroups, count + 1))}
              disabled={count >= maxGroups}
              accessibilityRole="button"
              accessibilityLabel="Aumentar número de grupos"
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", opacity: count >= maxGroups ? 0.4 : 1 }}
            >
              <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 18 }}>+</Text>
            </Pressable>
          </View>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11.5, textAlign: "center", marginTop: 10 }}>
            {sizesLabel} · máx. {maxGroups} grupos com {totalTeams} times
          </Text>
        </View>
      )}
    </View>
  );
}

function OptionDetail({ option }: { option: BracketOption }) {
  const C = useScreenColors();
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [o]);
  const ty = o.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={{ opacity: o, transform: [{ translateY: ty }], marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ color: option.iconColor, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>{option.tagline}</Text>

      {/* schematic preview */}
      <View style={{ backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14 }}>
        <FormatPreview type={option.type} color={option.iconColor} />
      </View>

      {/* stat chips */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {option.stats.map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: `${option.iconColor}14`, borderWidth: 1, borderColor: `${option.iconColor}33`, borderRadius: 13, paddingVertical: 11, alignItems: "center" }}>
            <Text style={{ color: option.iconColor, fontFamily: "Anton_400Regular", fontSize: 22, letterSpacing: 0.3 }}>{s.value}</Text>
            <Text numberOfLines={1} style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19 }}>{option.description}</Text>

      <View style={{ flexDirection: "row", gap: 9, marginTop: 12, alignItems: "flex-start", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: option.iconColor }}>
        <Text style={{ fontSize: 13, marginTop: 1 }}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.tx3, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>Na prática</Text>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11.5, lineHeight: 16.5 }}>{option.example}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function GenerateBracketScreen({ navigation, route }: any) {
  const C = useScreenColors();
  const tournamentId = route?.params?.tournamentId;
  const categories = route?.params?.categories ?? [];

  const [selected, setSelected] = useState<BracketType>(BracketType.SINGLE_ELIMINATION);
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [groupsMode, setGroupsMode] = useState<"auto" | "manual">("auto");
  const [groupsCount, setGroupsCount] = useState(2);

  // Confirmed team count per category — the bracket format must work for the
  // category with the FEWEST confirmed teams (the bottleneck).
  const { data: registrations } = useApi<{ categoryId: string; status: string }[]>(
    () => api.get(`/tournaments/${tournamentId}/registrations`, { params: { status: "CONFIRMED" } }).then((r) => r.data),
    [tournamentId],
  );

  const confirmedByCategory = new Map<string, number>();
  for (const reg of registrations ?? []) {
    confirmedByCategory.set(reg.categoryId, (confirmedByCategory.get(reg.categoryId) ?? 0) + 1);
  }
  const minConfirmedTeams = categories.length > 0
    ? Math.min(...categories.map((c: any) => confirmedByCategory.get(c.id) ?? 0))
    : 0;
  // A group needs at least 2 teams to play a round-robin against itself.
  const maxGroups = Math.max(2, Math.floor(minConfirmedTeams / 2));

  useEffect(() => {
    setGroupsCount((g) => Math.min(Math.max(g, 2), maxGroups));
  }, [maxGroups]);

  useEffect(() => {
    if (!registrations) return;
    if (disabledReason(selected, minConfirmedTeams)) {
      const firstEnabled = BRACKET_OPTIONS.find((o) => !disabledReason(o.type, minConfirmedTeams));
      if (firstEnabled) setSelected(firstEnabled.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations]);

  const handleGenerate = () => {
    const reason = disabledReason(selected, minConfirmedTeams);
    if (reason) {
      Alert.alert("Não é possível gerar", reason);
      return;
    }
    if (categories.length === 0) {
      Alert.alert("Erro", "Nenhuma categoria configurada.");
      return;
    }
    setConfirmVisible(true);
  };

  const confirmGenerate = async () => {
    setLoading(true);
    try {
      const groupsOverride = selected === BracketType.GROUPS_THEN_ELIMINATION && groupsMode === "manual" ? groupsCount : undefined;
      for (const cat of categories) {
        await tournamentsService.generateBracket(tournamentId, cat.id, selected, groupsOverride);
      }
      setConfirmVisible(false);
      navigation.replace("BracketReveal", { tournamentId });
    } catch (err: any) {
      setConfirmVisible(false);
      Alert.alert("Erro", getErrorMessage(err, "Falha ao gerar chaveamento."));
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = BRACKET_OPTIONS.find((o) => o.type === selected);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <StatusBar barStyle={C.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 14, marginBottom: 20 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" }}>
          <Icon name="back" size={19} color={C.tx} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.link, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 1 }}>Formato do torneio</Text>
          <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>Gerar chaveamento</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {BRACKET_OPTIONS.map((option) => {
          const isSelected = selected === option.type;
          const reason = disabledReason(option.type, minConfirmedTeams);
          const disabled = !!reason;
          return (
            <Pressable
              key={option.type}
              onPress={() => {
                if (disabled) return;
                LayoutAnimation.configureNext(LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
                setSelected(option.type);
              }}
              accessibilityRole="button"
              accessibilityLabel={disabled ? `${option.label}, indisponível — ${reason}` : `Selecionar ${option.label}`}
              accessibilityState={{ disabled }}
              style={{
                backgroundColor: isSelected ? C.purpleTintBg : C.card,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? C.purple : C.cardBorder,
                borderRadius: 20, padding: 16, marginBottom: 12,
                opacity: disabled ? 0.45 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                {/* Icon medallion */}
                <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: `${option.iconColor}1A`, borderWidth: 1, borderColor: `${option.iconColor}40`, alignItems: "center", justifyContent: "center" }}>
                  <BracketTypeIcon type={option.type} color={option.iconColor} size={30} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.tx, fontFamily: "Anton_400Regular", fontSize: 17, letterSpacing: 0.2, textTransform: "uppercase" }}>{option.label}</Text>
                  <Text style={{ color: C.tx2, fontFamily: "Oswald_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>{option.subtitle}</Text>
                </View>

                {/* Check / radio */}
                {isSelected ? (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.limeInk} strokeWidth={3}><Path d="M5 13l4 4L19 7" /></Svg>
                  </View>
                ) : (
                  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" }} />
                )}
              </View>

              {disabled && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                  <Icon name="info-circle" size={13} color="#FF9CA6" strokeWidth={2} />
                  <Text style={{ color: "#FF9CA6", fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                    {reason}
                  </Text>
                </View>
              )}

              {/* Expanded detail when selected */}
              {isSelected && !disabled ? <OptionDetail option={option} /> : null}

              {isSelected && !disabled && option.type === BracketType.GROUPS_THEN_ELIMINATION && (
                <GroupsCountPicker
                  mode={groupsMode}
                  setMode={setGroupsMode}
                  count={groupsCount}
                  setCount={setGroupsCount}
                  maxGroups={maxGroups}
                  totalTeams={minConfirmedTeams}
                />
              )}
            </Pressable>
          );
        })}

        {/* CTA at end of content */}
        <Text style={{ color: C.tx3, fontFamily: "Oswald_500Medium", fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center", marginTop: 8, marginBottom: 10 }}>
          {selectedOption?.label} · {categories.length} categoria{categories.length === 1 ? "" : "s"}
        </Text>
        <Pressable onPress={handleGenerate} disabled={loading} accessibilityRole="button" accessibilityLabel="Gerar chaveamento" style={{ position: "relative" }}>
          <View style={{ width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: C.purple, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: loading ? 0.6 : 1 }}>
            {loading ? (
              <ActivityIndicator size="small" color={C.onAccent} />
            ) : (
              <>
                <Text style={{ color: C.onAccent, fontFamily: "Oswald_700Bold", fontSize: 15, letterSpacing: 1.4, textTransform: "uppercase" }}>Gerar chaveamento</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.onAccent} strokeWidth={2.6}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
              </>
            )}
          </View>
          <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
          <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg }} />
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Gerar chaveamento"
        actionLabel="Gerar"
        cancelLabel="Cancelar"
        loading={loading}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmGenerate}
      >
        <View>
          <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 13.5, lineHeight: 20, marginBottom: 12 }}>
            O chaveamento será gerado para todas as categorias. Essa ação não pode ser desfeita.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: `${selectedOption?.iconColor}14`, borderWidth: 1, borderColor: `${selectedOption?.iconColor}33`, borderRadius: 12, padding: 12 }}>
            {selectedOption ? <BracketTypeIcon type={selectedOption.type} color={selectedOption.iconColor} size={22} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 0.4, textTransform: "uppercase" }}>{selectedOption?.label}</Text>
              <Text style={{ color: C.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 1 }}>
                {categories.length} categoria{categories.length === 1 ? "" : "s"}
                {selected === BracketType.GROUPS_THEN_ELIMINATION
                  ? groupsMode === "manual" ? ` · ${groupsCount} grupos` : " · grupos automáticos"
                  : ""}
              </Text>
            </View>
          </View>
        </View>
      </ConfirmDialog>
    </SafeAreaView>
  );
}
