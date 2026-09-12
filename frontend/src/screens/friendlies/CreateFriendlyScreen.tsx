import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useApi } from "@/hooks/useApi";
import { teamsService, TeamDTO } from "@/services/teamsService";
import { friendliesService } from "@/services/friendliesService";
import { getErrorMessage } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";

type ModalityOption = "Areia" | "Quadra";

function TeamSlot({ label, name, initials, avatar, loading, tilt, onPress, onClear }: {
  label: string; name: string | null; initials: string; avatar: string | null; loading?: boolean; tilt: number; onPress: () => void; onClear?: () => void;
}) {
  // The slot always sits on the dark purple duel-picker gradient (both themes),
  // so its colors are fixed dark-surface values — they must NOT flip with the
  // app theme or they'd vanish on the dark card in light mode.
  const accent = "#C6F82A";
  const avatarBg = "#2D1B69";
  const loadingBg = "rgba(255,255,255,0.06)";
  const dashedBorder = "rgba(255,255,255,0.28)";
  const plusColor = "rgba(255,255,255,0.5)";
  const clearBg = "#0B0B0D";
  const clearBorder = "rgba(255,255,255,0.2)";
  const clearStroke = "#fff";
  const nameColor = "#fff";
  const emptyNameColor = "rgba(255,255,255,0.55)";
  const subLabelColor = "rgba(255,255,255,0.5)";
  const filled = !!name;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={filled ? `${label}: ${name}` : `Selecionar ${label}`} style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: 78, height: 78, alignItems: "center", justifyContent: "center" }}>
        {loading ? (
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: loadingBg, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        ) : filled ? (
          <View style={{ width: 72, height: 72, borderRadius: 20, borderWidth: 2.5, borderColor: "#C6F82A", overflow: "hidden", transform: [{ rotate: `${tilt}deg` }], backgroundColor: avatarBg, alignItems: "center", justifyContent: "center" }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={{ color: accent, fontFamily: "Oswald_700Bold", fontSize: 20 }}>{initials}</Text>
            )}
          </View>
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: dashedBorder, alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={26} color={plusColor} strokeWidth={2.4} />
          </View>
        )}
        {filled && onClear ? (
          <Pressable onPress={(e) => { e.stopPropagation(); onClear(); }} hitSlop={8} style={{ position: "absolute", top: -2, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: clearBg, borderWidth: 1, borderColor: clearBorder, alignItems: "center", justifyContent: "center" }}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={clearStroke} strokeWidth={2.4}><Path d="M18 6 6 18M6 6l12 12" /></Svg>
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color: filled ? nameColor : emptyNameColor, fontFamily: filled ? "Anton_400Regular" : "Oswald_500Medium", fontSize: filled ? 14 : 11, letterSpacing: filled ? 0.2 : 0.6, textTransform: "uppercase", marginTop: 10, maxWidth: 110, textAlign: "center" }}>
        {name ?? label}
      </Text>
      {filled ? (
        <Text style={{ color: subLabelColor, fontFamily: "Oswald_500Medium", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{label}</Text>
      ) : (
        <Text style={{ color: accent, fontFamily: "Oswald_600SemiBold", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Toque</Text>
      )}
    </Pressable>
  );
}

const STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

interface OpponentTeam {
  id: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  memberCount: number;
}

export function CreateFriendlyScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const accentColor = "#C6F82A";
  const primary = "#7C3AED";
  const screenBg = isDark ? "#000000" : "#F6F4FC";
  const titleColor = isDark ? "#FFFFFF" : "#1A1428";
  const labelColor = isDark ? "#9A94A8" : "#6B6480";
  const inputBg = isDark ? "#16181C" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";
  const inputText = isDark ? "#FFFFFF" : "#1A1428";
  const placeholderColor = isDark ? "#6E6684" : "#9A94AC";
  const metaColor = isDark ? "#9A94A8" : "#6B6480";
  const iconColor = isDark ? "#6E6684" : "#847B98";
  const chevronColor = isDark ? "#6E6684" : "#847B98";
  const inactiveText = isDark ? "#9A94A8" : "#6B6480";
  const modalBg = isDark ? "#0B0B0D" : "#FFFFFF";
  const overlayBg = "rgba(0,0,0,0.65)";

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<OpponentTeam | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [cep, setCep] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [modality, setModality] = useState<ModalityOption>("Areia");
  const [beachFormat, setBeachFormat] = useState<"PAIR" | "QUARTET">("PAIR"); // só p/ Areia; Quadra infere SEXTET
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<{ team?: string; date?: string }>({});

  // My team modal state
  const [myTeamModalVisible, setMyTeamModalVisible] = useState(false);

  // Opponent search modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<OpponentTeam[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: myTeams, loading: loadingTeams, error: teamsError, refetch: refetchMyTeams } = useApi(() => teamsService.list(), []);
  useFocusEffect(useCallback(() => { refetchMyTeams({ keepData: false }); }, [refetchMyTeams]));

  const teams = (myTeams ?? []).map(t => ({
    id: t.id,
    name: t.name,
    initials: t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    avatarUrl: t.avatarUrl,
    memberCount: (t as any).memberCount ?? (t as any)._count?.members ?? 0,
  }));

  const selectedTeamData = teams.find(t => t.id === selectedTeam);

  const canCreate = selectedTeam && date.trim().length > 0;

  const doSearch = useCallback(async (q: string, cityFilter: string, stateFilter: string, offset = 0) => {
    setSearching(true);
    try {
      const res = await teamsService.search({
        q: q || undefined,
        city: cityFilter || undefined,
        state: stateFilter || undefined,
        offset,
        limit: 20,
      });
      const mapped = res.items.map((t: any) => ({
        id: t.id,
        name: t.name,
        avatarUrl: t.avatarUrl,
        city: t.city,
        state: t.state,
        memberCount: t._count?.members ?? 0,
      }));
      if (offset === 0) {
        setSearchResults(mapped);
      } else {
        setSearchResults(prev => [...prev, ...mapped]);
      }
      setHasMore(res.hasMore);
      setNextOffset(res.nextOffset);
    } catch {
      if (offset === 0) setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((q: string, cityFilter: string, stateFilter: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(q, cityFilter, stateFilter), 400);
  }, [doSearch]);

  const handleSearchCep = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      Alert.alert("CEP inválido", "Digite um CEP com 8 dígitos.");
      return;
    }
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        Alert.alert("CEP não encontrado", "Verifique o CEP digitado.");
      } else {
        setAddress(data.logradouro ?? "");
        setNeighborhood(data.bairro ?? "");
        setCity(data.localidade ?? "");
        setState(data.uf ?? "");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível buscar o CEP.");
    } finally {
      setLoadingCep(false);
    }
  };

  const openModal = () => {
    setModalVisible(true);
    setSearchQuery("");
    setSearchCity("");
    setSearchState("");
    setSearchResults([]);
    setHasMore(false);
    doSearch("", "", "");
  };

  const selectOpponent = (team: OpponentTeam) => {
    setOpponent(team);
    setModalVisible(false);
  };

  const validate = () => {
    const e: { team?: string; date?: string } = {};
    if (!selectedTeam) e.team = "Selecione seu time.";
    if (!date.trim()) {
      e.date = "Data é obrigatória.";
    } else {
      const parts = date.split("/");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const d = new Date(year, (month || 1) - 1, day);
      const invalidFormat = parts.length !== 3 || parts[2]?.length !== 4 || isNaN(day) || isNaN(month) || isNaN(year)
        || d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day;
      if (invalidFormat) {
        e.date = "Data inválida. Use o formato dd/mm/aaaa.";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d < today) e.date = "A data do amistoso não pode ser no passado.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let isoDate = date;
      const parts = date.split("/");
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        isoDate = `${year}-${parts[1]}-${parts[0]}`;
      }
      const timeNorm = time.replace(/[^\d:]/g, "");
      const isoDateTime = timeNorm
        ? `${isoDate}T${timeNorm.padEnd(5, "0")}:00.000Z`
        : `${isoDate}T00:00:00.000Z`;
      await friendliesService.create({
        requesterTeamId: selectedTeam!,
        challengedTeamId: opponent?.id ?? undefined,
        date: isoDateTime,
        startTime: timeNorm ? isoDateTime : undefined,
        address: address || undefined,
        addressNumber: addressNumber || undefined,
        complement: complement || undefined,
        neighborhood: neighborhood || undefined,
        cep: cep || undefined,
        city: city || undefined,
        state: state || undefined,
        modality: modality === "Areia" ? "BEACH" : "INDOOR",
        categoryFormat: modality === "Quadra" ? "SEXTET" : beachFormat,
      });
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Erro ao criar amistoso"));
    } finally {
      setSubmitting(false);
    }
  };

  const lightShadow = isDark
    ? {}
    : { shadowColor: "rgba(46,16,101,.1)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 };

  const renderTeamInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const renderOpponentItem = ({ item }: { item: OpponentTeam }) => (
    <Pressable
      onPress={() => selectOpponent(item)}
      accessibilityRole="button"
      accessibilityLabel={`Selecionar ${item.name}`}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingVertical: 12, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: inputBorder,
      }}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} />
      ) : (
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: isDark ? "#2D1B69" : "#E8DEFF",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: isDark ? "#C6F82A" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>
            {renderTeamInitials(item.name)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>
          {item.name}
        </Text>
        <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>
          {[item.city, item.state].filter(Boolean).join(", ") || "Sem localização"}
          {" · "}{item.memberCount} membros
        </Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={chevronColor} strokeWidth={2.2}>
        <Path d="m9 6 6 6-6 6" />
      </Svg>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <Pressable
                onPress={() => navigation?.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                style={{
                  width: 40, height: 40, borderRadius: 14,
                  backgroundColor: isDark ? "#171320" : "#FFFFFF",
                  borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.08)",
                  alignItems: "center", justifyContent: "center",
                  ...lightShadow,
                }}
              >
                <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} strokeWidth={2.2} />
              </Pressable>
              <Text style={{ color: titleColor, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Desafiar time
              </Text>
            </View>

            {/* ===== VS duel picker ===== */}
            <View style={{ borderRadius: 22, overflow: "hidden", marginBottom: errors.team ? 4 : 8, borderWidth: errors.team ? 1.5 : 0, borderColor: "#FF4D5E" }}>
              <LinearGradient colors={["#2D1B69", "#140E28"]} style={{ paddingVertical: 22, paddingHorizontal: 18 }}>
                <Text style={{ color: accentColor, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>Monte o confronto <Text style={{ color: accentColor }}>*</Text></Text>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <TeamSlot
                    label="Meu time"
                    name={selectedTeamData?.name ?? null}
                    initials={selectedTeamData?.initials ?? ""}
                    avatar={selectedTeamData?.avatarUrl ?? null}
                    loading={loadingTeams}
                    tilt={-4}
                    onPress={() => teams.length === 0 ? navigation?.navigate("CreateTeam") : setMyTeamModalVisible(true)}
                    onClear={selectedTeamData ? () => setSelectedTeam(null) : undefined}
                  />
                  <View style={{ paddingTop: 24 }}>
                    <Text style={{ color: accentColor, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.5 }}>VS</Text>
                  </View>
                  <TeamSlot
                    label="Adversário"
                    name={opponent?.name ?? null}
                    initials={opponent ? renderTeamInitials(opponent.name) : ""}
                    avatar={opponent?.avatarUrl ?? null}
                    tilt={4}
                    onPress={openModal}
                    onClear={opponent ? () => setOpponent(null) : undefined}
                  />
                </View>
              </LinearGradient>
            </View>
            {errors.team ? (
              <Text style={{ color: "#FF4D5E", fontFamily: "Manrope_600SemiBold", fontSize: 11.5, marginBottom: 10 }}>{errors.team}</Text>
            ) : null}
            {teamsError ? (
              <Text style={{ color: "#FF6B79", fontFamily: "Manrope_500Medium", fontSize: 12, marginBottom: 12 }}>{teamsError}</Text>
            ) : teams.length === 0 && !loadingTeams ? (
              <Pressable onPress={() => navigation?.navigate("CreateTeam")} style={{ marginBottom: 12, marginTop: 8, alignItems: "center" }}>
                <Text style={{ color: isDark ? accentColor : primary, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>Você não tem times · Criar time →</Text>
              </Pressable>
            ) : <View style={{ height: 12 }} />}

            {/* Data e hora */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 7 }}>
                  Data<Text style={{ color: accentColor }}> *</Text>
                </Text>
                <DateTimeField
                  pattern="dd/MM/yyyy"
                  value={date}
                  onChange={(v) => { setDate(v); if (errors.date) setErrors((p) => ({ ...p, date: undefined })); }}
                  placeholder="DD/MM/AAAA"
                  accessibilityLabel="Data do amistoso"
                >
                  {({ text, isEmpty }) => (
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 8,
                      backgroundColor: inputBg, borderWidth: 1, borderColor: errors.date ? "#FF4D5E" : inputBorder,
                      borderRadius: 14, padding: 12, paddingHorizontal: 15,
                      ...lightShadow,
                    }}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2}>
                        <Rect x={3} y={4} width={18} height={18} rx={3} />
                        <Path d="M16 2v4M8 2v4M3 10h18" />
                      </Svg>
                      <Text style={{ flex: 1, color: isEmpty ? placeholderColor : inputText, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                        {text}
                      </Text>
                    </View>
                  )}
                </DateTimeField>
                {errors.date ? (
                  <Text style={{ color: "#FF4D5E", fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 6 }}>{errors.date}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 7 }}>
                  Horário
                </Text>
                <DateTimeField
                  pattern="HH:mm"
                  value={time}
                  onChange={setTime}
                  placeholder="HH:MM"
                  accessibilityLabel="Horário do amistoso"
                >
                  {({ text, isEmpty }) => (
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 8,
                      backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                      borderRadius: 14, padding: 12, paddingHorizontal: 15,
                      ...lightShadow,
                    }}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2}>
                        <Circle cx={12} cy={12} r={9} />
                        <Path d="M12 7v5l3 3" />
                      </Svg>
                      <Text style={{ flex: 1, color: isEmpty ? placeholderColor : inputText, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                        {text}
                      </Text>
                    </View>
                  )}
                </DateTimeField>
              </View>
            </View>

            {/* CEP */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 8 }}>
              CEP
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
              borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10,
              ...lightShadow,
            }}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2}>
                <Path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" />
                <Circle cx={12} cy={9} r={2.5} />
              </Svg>
              <TextInput
                value={cep}
                onChangeText={setCep}
                placeholder="00000-000"
                placeholderTextColor={placeholderColor}
                style={{ flex: 1, color: inputText, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 }}
                accessibilityLabel="CEP"
                keyboardType="numeric"
              />
              <Pressable onPress={handleSearchCep} disabled={loadingCep} accessibilityRole="button" accessibilityLabel="Buscar CEP">
                {loadingCep ? (
                  <ActivityIndicator size="small" color={isDark ? accentColor : primary} />
                ) : (
                  <Text style={{ color: isDark ? accentColor : primary, fontFamily: "Manrope_700Bold", fontSize: 11 }}>Buscar</Text>
                )}
              </Pressable>
            </View>

            {/* Address found feedback */}
            {address.length > 0 && (
              <View style={{
                backgroundColor: isDark ? "rgba(198,248,42,.06)" : "rgba(124,58,237,.05)",
                borderWidth: 1, borderColor: isDark ? "rgba(198,248,42,.12)" : "rgba(124,58,237,.12)",
                borderRadius: 14, padding: 10, paddingHorizontal: 15, marginBottom: 12,
              }}>
                <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, marginBottom: 2 }}>
                  Endereço encontrado
                </Text>
                <Text style={{ color: titleColor, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                  {[address, neighborhood].filter(Boolean).join(", ")}
                  {city ? ` · ${[city, state].filter(Boolean).join("/")}` : ""}
                </Text>
              </View>
            )}

            {/* Número + Complemento */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 8 }}>
                  Número <Text style={{ color: accentColor }}>*</Text>
                </Text>
                <View style={{
                  backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                  borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15,
                  ...lightShadow,
                }}>
                  <TextInput
                    value={addressNumber}
                    onChangeText={setAddressNumber}
                    placeholder="N"
                    placeholderTextColor={placeholderColor}
                    style={{ color: inputText, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 }}
                    accessibilityLabel="Número"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 8 }}>
                  Complemento
                </Text>
                <View style={{
                  backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                  borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15,
                  ...lightShadow,
                }}>
                  <TextInput
                    value={complement}
                    onChangeText={setComplement}
                    placeholder="Ex: Arena"
                    placeholderTextColor={placeholderColor}
                    style={{ color: inputText, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 }}
                    accessibilityLabel="Complemento"
                  />
                </View>
              </View>
            </View>

            {/* Modalidade */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 8 }}>
              Modalidade
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {(["Areia", "Quadra"] as ModalityOption[]).map((opt) => {
                const isActive = modality === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setModality(opt)}
                    accessibilityRole="button"
                    accessibilityLabel={opt}
                    style={{
                      flex: 1, paddingVertical: 16, borderRadius: 16,
                      backgroundColor: isActive ? "#C6F82A" : inputBg,
                      borderWidth: 1, borderColor: isActive ? "#C6F82A" : inputBorder,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: isActive ? "#12100A" : inactiveText, fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Formato */}
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 12, marginBottom: 8 }}>
              Formato
            </Text>
            {modality === "Areia" ? (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {([["PAIR", "Dupla", "2 jogadores"], ["QUARTET", "Quarteto", "4 jogadores"]] as const).map(([key, label, sub]) => {
                  const isActive = beachFormat === key;
                  return (
                    <Pressable key={key} onPress={() => setBeachFormat(key)} accessibilityRole="button" accessibilityLabel={label}
                      style={{ flex: 1, paddingVertical: 14, borderRadius: 16, gap: 2, backgroundColor: isActive ? "#C6F82A" : inputBg, borderWidth: 1, borderColor: isActive ? "#C6F82A" : inputBorder, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: isActive ? "#12100A" : inactiveText, fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{label}</Text>
                      <Text style={{ color: isActive ? "rgba(18,16,10,0.65)" : metaColor, fontFamily: "Oswald_500Medium", fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase" }}>{sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: isDark ? "rgba(124,58,237,0.12)" : "#C6F82A", borderWidth: 1, borderColor: isDark ? "rgba(139,92,246,0.3)" : "#C6F82A", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isDark ? "#fff" : "#12100A", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Sexteto</Text>
                  <Text style={{ color: isDark ? metaColor : "rgba(18,16,10,0.65)", fontFamily: "Manrope_500Medium", fontSize: 11 }}>Quadra usa 6 jogadores por time</Text>
                </View>
              </View>
            )}

            {/* CTA — notched purple */}
            <Pressable
              onPress={handleCreate}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Enviar desafio"
              style={{ position: "relative" }}
            >
              <View style={{ width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: (canCreate && !submitting) ? 1 : 0.45 }}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Enviar desafio</Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
                  </>
                )}
              </View>
              <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: screenBg }} />
              <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: screenBg }} />
            </Pressable>
          </View>
        </KeyboardAwareScrollView>

      {/* My Team Selection Modal */}
      <Modal
        visible={myTeamModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMyTeamModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: overlayBg }}>
          <View style={{
            flex: 1, marginTop: 200, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: modalBg, overflow: "hidden",
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            }}>
              <Text style={{ color: titleColor, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase" }}>
                Selecionar meu time
              </Text>
              <Pressable
                onPress={() => setMyTeamModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={12}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={metaColor} strokeWidth={2.2}>
                  <Path d="M18 6 6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              {teams.map((team) => {
                const isSelected = selectedTeam === team.id;
                return (
                  <Pressable
                    key={team.id}
                    onPress={() => { setSelectedTeam(team.id); setMyTeamModalVisible(false); setErrors((p) => ({ ...p, team: undefined })); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar ${team.name}`}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      paddingVertical: 14, paddingHorizontal: 4,
                      borderBottomWidth: 1, borderBottomColor: inputBorder,
                    }}
                  >
                    {team.avatarUrl ? (
                      <Image source={{ uri: team.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                    ) : (
                      <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: isDark ? "#2D1B69" : "#E8DEFF",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: isDark ? "#C6F82A" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 }}>
                          {team.initials}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: titleColor, fontFamily: "Manrope_600SemiBold", fontSize: 14 }}>
                        {team.name}
                      </Text>
                      <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2 }}>
                        {team.memberCount} membros
                      </Text>
                    </View>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : (isDark ? "rgba(255,255,255,.15)" : "rgba(26,16,48,.15)"),
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && (
                        <View style={{
                          width: 12, height: 12, borderRadius: 6,
                          backgroundColor: accentColor,
                        }} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Opponent Search Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: overlayBg }}>
          <View style={{
            flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: modalBg, overflow: "hidden",
          }}>
            {/* Modal header */}
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
            }}>
              <Text style={{ color: titleColor, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase" }}>
                Buscar adversário
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={12}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={metaColor} strokeWidth={2.2}>
                  <Path d="M18 6 6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>

            {/* Search input */}
            <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                backgroundColor: isDark ? "#0C0A12" : "#F6F4FC",
                borderWidth: 1, borderColor: inputBorder,
                borderRadius: 14, padding: 11, paddingHorizontal: 14,
              }}>
                <Icon name="search" size={16} color={iconColor} strokeWidth={2} />
                <TextInput
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    debouncedSearch(text, searchCity, searchState);
                  }}
                  placeholder="Nome do time"
                  placeholderTextColor={placeholderColor}
                  style={{ flex: 1, color: inputText, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 }}
                  autoFocus
                  accessibilityLabel="Buscar time por nome"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => { setSearchQuery(""); debouncedSearch("", searchCity, searchState); }} hitSlop={8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={metaColor} strokeWidth={2}>
                      <Path d="M18 6 6 18M6 6l12 12" />
                    </Svg>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Filters row */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
              {/* City filter */}
              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: isDark ? "#0C0A12" : "#F6F4FC",
                  borderWidth: 1, borderColor: inputBorder,
                  borderRadius: 12, padding: 9, paddingHorizontal: 12,
                }}>
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2}>
                    <Path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" />
                    <Circle cx={12} cy={9} r={2.5} />
                  </Svg>
                  <TextInput
                    value={searchCity}
                    onChangeText={(text) => {
                      setSearchCity(text);
                      debouncedSearch(searchQuery, text, searchState);
                    }}
                    placeholder="Cidade"
                    placeholderTextColor={placeholderColor}
                    style={{ flex: 1, color: inputText, fontFamily: "Manrope_500Medium", fontSize: 12, padding: 0 }}
                    accessibilityLabel="Filtrar por cidade"
                  />
                </View>
              </View>

              {/* State filter */}
              <View style={{ width: 90 }}>
                <Pressable
                  onPress={() => setShowStateDropdown(!showStateDropdown)}
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar por estado"
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: isDark ? "#0C0A12" : "#F6F4FC",
                    borderWidth: 1, borderColor: inputBorder,
                    borderRadius: 12, padding: 9, paddingHorizontal: 12,
                  }}
                >
                  <Text style={{
                    color: searchState ? inputText : placeholderColor,
                    fontFamily: "Manrope_500Medium", fontSize: 12,
                  }}>
                    {searchState || "UF"}
                  </Text>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={chevronColor} strokeWidth={2.2}>
                    <Path d="m6 9 6 6 6-6" />
                  </Svg>
                </Pressable>
              </View>
            </View>

            {/* State dropdown */}
            {showStateDropdown && (
              <View style={{
                position: "absolute", top: 160, right: 20, zIndex: 100,
                backgroundColor: modalBg, borderWidth: 1, borderColor: inputBorder,
                borderRadius: 14, maxHeight: 300, width: 90,
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
              }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <Pressable
                    onPress={() => {
                      setSearchState("");
                      setShowStateDropdown(false);
                      debouncedSearch(searchQuery, searchCity, "");
                    }}
                    style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: inputBorder }}
                  >
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12 }}>Todos</Text>
                  </Pressable>
                  {STATES.map(uf => (
                    <Pressable
                      key={uf}
                      onPress={() => {
                        setSearchState(uf);
                        setShowStateDropdown(false);
                        debouncedSearch(searchQuery, searchCity, uf);
                      }}
                      style={{
                        paddingVertical: 10, paddingHorizontal: 14,
                        borderBottomWidth: 1, borderBottomColor: inputBorder,
                        backgroundColor: searchState === uf ? (isDark ? "rgba(198,248,42,.08)" : "rgba(124,58,237,.06)") : "transparent",
                      }}
                    >
                      <Text style={{
                        color: searchState === uf ? accentColor : titleColor,
                        fontFamily: searchState === uf ? "Manrope_700Bold" : "Manrope_500Medium",
                        fontSize: 12,
                      }}>{uf}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Active filters */}
            {(searchCity || searchState) && (
              <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 8, flexWrap: "wrap" }}>
                {searchCity ? (
                  <Pressable
                    onPress={() => { setSearchCity(""); debouncedSearch(searchQuery, "", searchState); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 4,
                      backgroundColor: isDark ? "rgba(198,248,42,.08)" : "rgba(124,58,237,.06)",
                      borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                      {searchCity}
                    </Text>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={2.5}>
                      <Path d="M18 6 6 18M6 6l12 12" />
                    </Svg>
                  </Pressable>
                ) : null}
                {searchState ? (
                  <Pressable
                    onPress={() => { setSearchState(""); debouncedSearch(searchQuery, searchCity, ""); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 4,
                      backgroundColor: isDark ? "rgba(198,248,42,.08)" : "rgba(124,58,237,.06)",
                      borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontSize: 11 }}>
                      {searchState}
                    </Text>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={2.5}>
                      <Path d="M18 6 6 18M6 6l12 12" />
                    </Svg>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* Results */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderOpponentItem}
              onEndReached={() => {
                if (hasMore && nextOffset != null && !searching) {
                  doSearch(searchQuery, searchCity, searchState, nextOffset);
                }
              }}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                searching ? (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <ActivityIndicator size="small" color={accentColor} />
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 8 }}>
                      Buscando times...
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 30 }}>
                    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={metaColor} strokeWidth={1.5}>
                      <Circle cx={11} cy={11} r={8} />
                      <Path d="m21 21-4.35-4.35" />
                    </Svg>
                    <Text style={{ color: metaColor, fontFamily: "Manrope_500Medium", fontSize: 13, marginTop: 12, textAlign: "center" }}>
                      Nenhum time encontrado
                    </Text>
                    <Text style={{ color: placeholderColor, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 4, textAlign: "center" }}>
                      Tente outro nome, cidade ou estado
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                searching && searchResults.length > 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 16 }}>
                    <ActivityIndicator size="small" color={accentColor} />
                  </View>
                ) : null
              }
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
