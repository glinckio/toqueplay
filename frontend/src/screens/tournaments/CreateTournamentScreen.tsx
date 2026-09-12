import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Animated,
  Easing,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/ui/Icon";
import { tournamentsService } from "@/services/tournamentsService";
import { getErrorMessage } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { Toggle } from "@/components/ui/Toggle";

const STEPS = ["Básico", "Estrutura", "Categorias", "Revisão"];
const STEP_DESC = ["Nome, banner e tipo do evento", "Data, local e árbitros", "Formatos, valores e patrocínio", "Confira tudo e publique"];
const BANNER_IMAGE = "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=680&q=68&auto=format&fit=crop";

const FACILITIES = ["Estacionamento", "Banheiros", "Cantina", "Vestiário"];

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function parseDateBRLoose(value: string): Date | null {
  const parts = value.trim().split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yy] = parts;
  if (dd.length !== 2 || mm.length !== 2 || yy.length !== 2) return null;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = 2000 + parseInt(yy, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function CreateTournamentScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const editingId = route?.params?.tournamentId as string | undefined;
  const isEditing = !!editingId;
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const stepDirection = useRef(1); // 1 = avançando, -1 = voltando
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step]);

  const stepOpacity = stepAnim;
  const stepTranslateX = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [stepDirection.current * 28, 0] });
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(isEditing);

  const accentColor = "#7C3AED";       // purple — accents (fluxo de criação de torneio)
  const primary = "#7C3AED";           // purple — primary actions
  const bgBase = isDark ? "#000000" : "#F6F4FC";
  const inputBg = isDark ? "#16181C" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(26,16,48,0.09)";
  const labelColor = isDark ? "#9A94A8" : "#6B6480";
  const textPrimary = isDark ? "#FFFFFF" : "#1A1428";
  const inactivePill = isDark ? "#16181C" : "#FFFFFF";
  const inactivePillText = isDark ? "#9A94A8" : "#6B6480";
  const progressInactive = isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";
  const stepInactive = isDark ? "#6E6684" : "#C3BCD4";
  const backBtnBg = isDark ? "#16181C" : "#FFFFFF";
  const backBtnBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";
  const required = "#C6F82A";
  const cardBg = isDark ? "#16181C" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";

  const [selectedType, setSelectedType] = useState<"unique" | "circuit">("unique");
  // Regra de atleta repetido: por padrao o mesmo CPF so joga por um time no torneio.
  const [allowSameAthlete, setAllowSameAthlete] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(["Estacionamento", "Banheiros"]);
  const [selectedGender, setSelectedGender] = useState("Masculino");
  const [selectedModality, setSelectedModality] = useState("Areia");
  const [selectedFormat, setSelectedFormat] = useState("Dupla");
  const [selectedSets, setSelectedSets] = useState("3 sets");
  const [selectedSemiSets, setSelectedSemiSets] = useState("Igual");
  const [selectedFinalSets, setSelectedFinalSets] = useState("Igual");
  const [pendingReferees, setPendingReferees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentTime, setTournamentTime] = useState("");
  const [tournamentCep, setTournamentCep] = useState("");
  const [tournamentNumber, setTournamentNumber] = useState("");
  const [tournamentComplement, setTournamentComplement] = useState("");
  const [tournamentAddress, setTournamentAddress] = useState("");
  const [tournamentMaxTeams, setTournamentMaxTeams] = useState("");
  const [categoryPrice, setCategoryPrice] = useState("");
  const [categoryDeadline, setCategoryDeadline] = useState("");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [sponsorInput, setSponsorInput] = useState("");
  const [categories, setCategories] = useState([{ id: "1" }]);
  const [referees, setReferees] = useState<{ id: string; user: { id: string; name: string; email: string; avatarUrl: string | null } }[]>([]);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [addingReferee, setAddingReferee] = useState(false);

  const validateStep = (targetStep: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {};
    if (targetStep === 0) {
      if (!tournamentName.trim()) stepErrors.name = "Nome do torneio é obrigatório.";
    }
    if (targetStep === 1) {
      if (!tournamentDate.trim()) {
        stepErrors.date = "Data é obrigatória.";
      } else {
        const parsed = parseDateBRLoose(tournamentDate);
        if (!parsed) {
          stepErrors.date = "Data inválida. Use o formato dd/mm/aa.";
        } else {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + 7);
          minDate.setHours(0, 0, 0, 0);
          if (parsed < minDate) stepErrors.date = "A data do torneio precisa ser pelo menos 1 semana no futuro.";
        }
      }
      const cepDigits = tournamentCep.replace(/\D/g, "");
      if (!cepDigits) stepErrors.cep = "CEP é obrigatório.";
      else if (cepDigits.length !== 8) stepErrors.cep = "CEP inválido. Digite os 8 dígitos.";
      if (!tournamentNumber.trim()) stepErrors.number = "Número é obrigatório.";
    }
    return stepErrors;
  };

  const handleContinue = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    stepDirection.current = 1;
    setStep(step + 1);
  };

  const goToStep = (target: number) => {
    stepDirection.current = target >= step ? 1 : -1;
    setErrors({});
    setStep(target);
  };

  useEffect(() => {
    if (!editingId) return;
    tournamentsService.findOne(editingId).then((t: any) => {
      setTournamentName(t.name || "");
      if (t.imageUrl) setBannerUri(t.imageUrl);
      setSelectedType(t.eventType === "CIRCUIT" ? "circuit" : "unique");
      setAllowSameAthlete(Boolean((t as any).allowSameAthleteMultipleTeams));

      const stage = t.stages?.[0];
      if (stage) {
        if (stage.date) {
          const d = new Date(stage.date);
          setTournamentDate(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`);
        }
        if (stage.startTime) {
          const st = new Date(stage.startTime);
          setTournamentTime(`${String(st.getHours()).padStart(2, "0")}:${String(st.getMinutes()).padStart(2, "0")}`);
        }
        if (stage.cep) setTournamentCep(stage.cep);
        if (stage.number) setTournamentNumber(stage.number);
        if (stage.complement) setTournamentComplement(stage.complement);
        if (stage.address) setTournamentAddress(stage.address);
        if (stage.maxTeams) setTournamentMaxTeams(String(stage.maxTeams));
        if (stage.facilities?.length) {
          setSelectedFacilities(stage.facilities.map((f: any) => f.name));
        }
      }

      const cat = t.categories?.[0];
      if (cat) {
        const typeMap: Record<string, string> = { MALE: "Masculino", FEMALE: "Feminino", MIX: "Misto" };
        const modalityMap: Record<string, string> = { BEACH: "Areia", COURT: "Quadra" };
        const formatMap: Record<string, string> = { PAIR: "Dupla", QUARTET: "Quarteto", SEXTET: "Sexteto" };
        if (typeMap[cat.type]) setSelectedGender(typeMap[cat.type]);
        if (modalityMap[cat.modality]) setSelectedModality(modalityMap[cat.modality]);
        if (formatMap[cat.format]) setSelectedFormat(formatMap[cat.format]);
        if (cat.bestOfSets) setSelectedSets(cat.bestOfSets === 1 ? "1 set" : `${cat.bestOfSets} sets`);
        if (cat.semifinalBestOfSets) setSelectedSemiSets(cat.semifinalBestOfSets === 1 ? "1 set" : `${cat.semifinalBestOfSets} sets`);
        if (cat.finalBestOfSets) setSelectedFinalSets(cat.finalBestOfSets === 1 ? "1 set" : `${cat.finalBestOfSets} sets`);
        if (cat.registrationPrice != null) setCategoryPrice(String(cat.registrationPrice).replace(".", ","));
        if (cat.registrationDeadline) {
          const rd = new Date(cat.registrationDeadline);
          setCategoryDeadline(`${String(rd.getDate()).padStart(2, "0")}/${String(rd.getMonth() + 1).padStart(2, "0")}/${String(rd.getFullYear()).slice(2)}`);
        }
      }
      if (t.categories?.length) {
        setCategories(t.categories.map((c: any, i: number) => ({ id: c.id || String(i + 1) })));
      }
    }).catch(() => {}).finally(() => setLoadingTournament(false));
    tournamentsService.getReferees(editingId).then(setReferees).catch(() => {});
  }, [editingId]);

  const handlePickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBannerUri(result.assets[0].uri);
    }
  };

  const handleShareTournament = async () => {
    try {
      const link = publishedId ? `toqueplay://tournament/${publishedId}` : "";
      await Share.share({
        message: `Confira o torneio ${tournamentName} no ToquePlay!\n${link}`,
      });
    } catch {}
  };

  const handleAddReferee = async () => {
    if (!refereeEmail.trim()) return;
    if (!editingId) {
      Alert.alert("Salve o torneio primeiro", "É necessário salvar o torneio antes de adicionar árbitros.");
      return;
    }
    setAddingReferee(true);
    try {
      const result = await tournamentsService.addReferee(editingId, refereeEmail.trim());
      setReferees(prev => [...prev, result]);
      setRefereeEmail("");
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível adicionar o árbitro."));
    } finally {
      setAddingReferee(false);
    }
  };

  const handleRemoveReferee = async (refereeId: string) => {
    if (!editingId) return;
    try {
      await tournamentsService.removeReferee(editingId, refereeId);
      setReferees(prev => prev.filter(r => r.id !== refereeId));
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível remover o árbitro."));
    }
  };

  const handleAddCategory = () => {
    setCategories(prev => [...prev, { id: String(prev.length + 1) }]);
  };

  const handleRemoveCategory = (id: string) => {
    if (categories.length <= 1) return;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const buildStructurePayload = () => {
    const genderMap: Record<string, string> = { Masculino: "MALE", Feminino: "FEMALE", Misto: "MIX" };
    const modalityMap: Record<string, string> = { Areia: "BEACH", Quadra: "COURT" };
    const formatMap: Record<string, string> = { Dupla: "PAIR", Quarteto: "QUARTET", Sexteto: "SEXTET" };
    const setsMap: Record<string, number> = { "1 set": 1, "3 sets": 3, "5 sets": 5 };
    const semiFinalMap: Record<string, number | undefined> = { "Igual": undefined, "1 set": 1, "3 sets": 3, "5 sets": 5 };

    const parseDateBR = (d: string) => {
      const parts = d.replace(/\s/g, "").split("/");
      if (parts.length !== 3) return undefined;
      const [day, month, yearShort] = parts;
      const year = yearShort.length === 2 ? `20${yearShort}` : yearShort;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
    };

    const parsePrice = (p: string) => {
      const cleaned = p.replace(/[^\d,]/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    const addressParts = tournamentAddress.split(", ");
    const logradouro = addressParts[0] || undefined;
    const bairro = addressParts.length >= 3 ? addressParts[1] : undefined;
    const cidadeUf = addressParts[addressParts.length - 1] || "";
    const [city, state] = cidadeUf.includes(" - ") ? cidadeUf.split(" - ") : [cidadeUf, undefined];

    return {
      eventType: selectedType === "circuit" ? "CIRCUIT" : "SINGLE",
      allowSameAthleteMultipleTeams: allowSameAthlete,
      stages: [{
        name: "Etapa 1",
        date: parseDateBR(tournamentDate) || new Date().toISOString(),
        startTime: tournamentTime ? parseDateBR(tournamentDate)?.replace("00:00:00", `${tournamentTime}:00`) : undefined,
        maxTeams: tournamentMaxTeams ? parseInt(tournamentMaxTeams, 10) || undefined : undefined,
        address: tournamentAddress || undefined,
        street: logradouro,
        number: tournamentNumber || undefined,
        complement: tournamentComplement || undefined,
        neighborhood: bairro,
        cep: tournamentCep.replace(/\D/g, "") || undefined,
        city: city?.trim() || undefined,
        state: state?.trim() || undefined,
        facilities: selectedFacilities.map(f => ({ name: f, available: true })),
      }],
      categories: categories.map(() => ({
        type: genderMap[selectedGender] || "MALE",
        modality: modalityMap[selectedModality] || "BEACH",
        format: formatMap[selectedFormat] || "PAIR",
        bestOfSets: setsMap[selectedSets] || 3,
        semifinalBestOfSets: semiFinalMap[selectedSemiSets],
        finalBestOfSets: semiFinalMap[selectedFinalSets],
        registrationPrice: parsePrice(categoryPrice),
        registrationDeadline: categoryDeadline ? parseDateBR(categoryDeadline) : undefined,
      })),
    };
  };

  const handlePublish = async () => {
    setSubmitting(true);
    let stepName = "init";
    try {
      let targetId = editingId;
      if (!targetId) {
        stepName = "create";
        const created = await tournamentsService.create({ name: tournamentName || "Novo Torneio" });
        targetId = created.id;
      } else {
        stepName = "update";
        await tournamentsService.update(targetId, { name: tournamentName });
      }
      const payload = buildStructurePayload();
      console.log("[PUBLISH] structure payload:", JSON.stringify(payload, null, 2));
      stepName = "updateStructure";
      await tournamentsService.updateStructure(targetId, payload);
      stepName = "addReferee";
      for (const email of pendingReferees) {
        try { await tournamentsService.addReferee(targetId, email); } catch (re: any) { console.log("[PUBLISH] addReferee falhou", email, re?.response?.data); }
      }
      stepName = "publish";
      await tournamentsService.publish(targetId);
      setPublishedId(targetId);
      setShowSuccess(true);
    } catch (err: any) {
      if (__DEV__) console.log(`[PUBLISH] falhou no passo "${stepName}" · status`, err?.response?.status, "· body:", JSON.stringify(err?.response?.data));
      Alert.alert("Não foi possível publicar", getErrorMessage(err, "Tente novamente em instantes."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      let targetId = editingId;
      if (!targetId) {
        const created = await tournamentsService.create({ name: tournamentName || "Novo Torneio" });
        targetId = created.id;
      } else {
        await tournamentsService.update(targetId, { name: tournamentName });
      }
      await tournamentsService.updateStructure(targetId, buildStructurePayload());
      for (const email of pendingReferees) {
        try { await tournamentsService.addReferee(targetId, email); } catch {}
      }
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert("Erro", getErrorMessage(err, "Não foi possível salvar o rascunho."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTournament) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: bgBase }}>
        <Image source={{ uri: BANNER_IMAGE }} style={{ position: "absolute", width: "100%", height: 340, opacity: 0.5 }} contentFit="cover" cachePolicy="memory-disk" />
        <LinearGradient
          colors={isDark ? ["rgba(14,11,20,0.4)", "#0E0B14"] : ["rgba(246,244,252,0.4)", "#F6F4FC"]}
          locations={[0, 0.52]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
          <View style={{
            width: 96, height: 96, borderRadius: 32,
            backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)",
            borderWidth: 1, borderColor: isDark ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.3)",
            alignItems: "center", justifyContent: "center", marginBottom: 28,
          }}>
            <Icon name="check" size={48} color={primary} strokeWidth={2.2} />
          </View>
          <Text style={{ color: accentColor, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Tudo pronto</Text>
          <Text style={{ color: textPrimary, fontFamily: "Anton_400Regular", fontSize: 38, letterSpacing: 0.5, lineHeight: 38, textAlign: "center", textTransform: "uppercase", marginBottom: 12 }}>{"Torneio\npublicado!"}</Text>
          <Text style={{ color: "#A9A2BC", fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20.8, textAlign: "center", maxWidth: 280, marginBottom: 40 }}>
            A <Text style={{ color: textPrimary, fontFamily: "Manrope_700Bold" }}>{tournamentName || "Novo Torneio"}</Text> já está no ar. As inscrições estão abertas e os atletas por perto foram avisados.
          </Text>
          <Pressable onPress={() => navigation?.replace("TournamentDetail", { id: publishedId })} style={{ position: "relative", width: "100%", marginBottom: 12 }}>
            <View style={{ width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: primary, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Ver torneio</Text>
            </View>
            <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: bgBase }} />
            <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: bgBase }} />
          </Pressable>
          <Pressable onPress={handleShareTournament} style={{
            width: "100%", paddingVertical: 14, borderRadius: 16,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Icon name="share" size={16} color={textPrimary} />
            <Text style={{ color: textPrimary, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Compartilhar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <Pressable
              onPress={() => { step > 0 ? goToStep(step - 1) : navigation?.goBack(); }}
              style={{
                width: 40, height: 40, borderRadius: 13,
                backgroundColor: backBtnBg,
                borderWidth: 1, borderColor: backBtnBorder,
                alignItems: "center", justifyContent: "center",
                ...(isDark ? {} : { shadowColor: "rgba(26,16,48,0.25)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 }),
              }}
            >
              <Icon name="back" size={19} color={isDark ? "#CFC8E0" : "#4A4460"} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: textPrimary, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.3, textTransform: "uppercase" }}>{isEditing ? "Editar torneio" : "Criar torneio"}</Text>
              <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 1 }}>Configure e publique</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
            {STEPS.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? accentColor : progressInactive }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
            {STEPS.map((s, i) => (
              <Text key={s} style={{
                fontFamily: i === step ? "Manrope_700Bold" : "Manrope_600SemiBold",
                fontSize: 10,
                fontWeight: i === step ? "700" : "600",
                color: i === step ? accentColor : stepInactive,
              }}>{s}</Text>
            ))}
          </View>
        </View>

        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Animated.View key={step} style={{ opacity: stepOpacity, transform: [{ translateX: stepTranslateX }] }}>
            {/* Step hero */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <Text style={{ fontFamily: "Anton_400Regular", fontSize: 60, lineHeight: 60, letterSpacing: 0.5, color: "rgba(124,58,237,0.16)" }}>
                {String(step + 1).padStart(2, "0")}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: accentColor, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" }}>Passo {step + 1}</Text>
                <Text style={{ color: textPrimary, fontFamily: "Anton_400Regular", fontSize: 26, letterSpacing: 0.3, textTransform: "uppercase", lineHeight: 28 }}>{STEPS[step]}</Text>
                <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 }}>{STEP_DESC[step]}</Text>
              </View>
            </View>

            {step === 0 && <Step1Basic isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} selectedType={selectedType} setSelectedType={setSelectedType} inactivePill={inactivePill} inactivePillText={inactivePillText} bannerUri={bannerUri} onPickBanner={handlePickBanner} tournamentName={tournamentName} setTournamentName={setTournamentName} errors={errors} />}
            {step === 1 && <Step2Structure isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} accentColor={accentColor} selectedFacilities={selectedFacilities} setSelectedFacilities={setSelectedFacilities} date={tournamentDate} setDate={setTournamentDate} time={tournamentTime} setTime={setTournamentTime} cep={tournamentCep} setCep={setTournamentCep} number={tournamentNumber} setNumber={setTournamentNumber} complement={tournamentComplement} setComplement={setTournamentComplement} address={tournamentAddress} setAddress={setTournamentAddress} maxTeams={tournamentMaxTeams} setMaxTeams={setTournamentMaxTeams} allowSameAthlete={allowSameAthlete} setAllowSameAthlete={setAllowSameAthlete} selectedType={selectedType} referees={referees} refereeEmail={refereeEmail} setRefereeEmail={setRefereeEmail} addingReferee={addingReferee} onAddReferee={handleAddReferee} onRemoveReferee={handleRemoveReferee} isEditing={isEditing} cardBg={cardBg} cardBorder={cardBorder} pendingReferees={pendingReferees} setPendingReferees={setPendingReferees} errors={errors} />}
            {step === 2 && <Step3Categories isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} accentColor={accentColor} selectedGender={selectedGender} setSelectedGender={setSelectedGender} selectedModality={selectedModality} setSelectedModality={setSelectedModality} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} selectedSets={selectedSets} setSelectedSets={setSelectedSets} selectedSemiSets={selectedSemiSets} setSelectedSemiSets={setSelectedSemiSets} selectedFinalSets={selectedFinalSets} setSelectedFinalSets={setSelectedFinalSets} inactivePill={inactivePill} inactivePillText={inactivePillText} cardBg={cardBg} cardBorder={cardBorder} categoryPrice={categoryPrice} setCategoryPrice={setCategoryPrice} categoryDeadline={categoryDeadline} setCategoryDeadline={setCategoryDeadline} sponsors={sponsors} setSponsors={setSponsors} sponsorInput={sponsorInput} setSponsorInput={setSponsorInput} categories={categories} onAddCategory={handleAddCategory} onRemoveCategory={handleRemoveCategory} />}
            {step === 3 && <Step4Review isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} accentColor={accentColor} labelColor={labelColor} textPrimary={textPrimary} onEdit={() => goToStep(0)} tournamentName={tournamentName} tournamentDate={tournamentDate} tournamentAddress={tournamentAddress} maxTeams={tournamentMaxTeams} categoryPrice={categoryPrice} selectedGender={selectedGender} selectedModality={selectedModality} selectedFormat={selectedFormat} selectedSets={selectedSets} selectedType={selectedType} categories={categories} bannerUri={bannerUri} />}
          </Animated.View>
        </KeyboardAwareScrollView>

        {/* Footer — fica ancorado no rodape da tela. Com o teclado aberto ele fica por baixo,
            de proposito: o formulario continua rolando normalmente (quem cuida disso e o
            KeyboardAwareScrollView), e o teclado nao rouba area util da tela. */}
        <LinearGradient
          colors={isDark ? ["rgba(14,11,20,0)", bgBase] : ["rgba(246,244,252,0)", bgBase]}
          locations={[0, 0.3]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 26, flexDirection: step < 3 ? "row" : "column", gap: step < 3 ? 12 : 10 }}
        >
          {step < 3 ? (
            <>
              <Pressable onPress={() => { step > 0 ? goToStep(step - 1) : navigation?.goBack(); }} style={{
                paddingVertical: 15, paddingHorizontal: 22, borderRadius: 16,
                borderWidth: 1, borderColor: backBtnBorder,
              }}>
                <Text style={{ color: textPrimary, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Voltar</Text>
              </Pressable>
              <Pressable onPress={handleContinue} style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                paddingVertical: 16, borderRadius: 16, backgroundColor: primary,
              }}>
                <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase" }}>Continuar</Text>
                <Icon name="chevron-right" size={16} color="#fff" strokeWidth={2.6} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={handlePublish} disabled={submitting} style={{
                width: "100%", paddingVertical: 17, borderRadius: 16, backgroundColor: primary, alignItems: "center",
              }}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" }}>Publicar torneio</Text>
                )}
              </Pressable>
              <Pressable onPress={handleSaveDraft} disabled={submitting} style={{
                width: "100%", paddingVertical: 14, borderRadius: 16,
                borderWidth: 1, borderColor: backBtnBorder,
                alignItems: "center",
              }}>
                <Text style={{ color: textPrimary, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Salvar como rascunho</Text>
              </Pressable>
            </>
          )}
        </LinearGradient>
    </SafeAreaView>
  );
}

function FieldLabel({ text, isRequired, color, required }: { text: string; isRequired?: boolean; color: string; required: string }) {
  return (
    <Text style={{ color, fontFamily: "Manrope_600SemiBold", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
      {text}{isRequired && <Text style={{ color: required }}> *</Text>}
    </Text>
  );
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Text style={{ color: "#FF4D5E", fontFamily: "Manrope_600SemiBold", fontSize: 11.5, marginTop: 6, marginBottom: 2 }}>
      {text}
    </Text>
  );
}

function Step1Basic({ isDark, inputBg, inputBorder, labelColor, textPrimary, required, selectedType, setSelectedType, inactivePill, inactivePillText, bannerUri, onPickBanner, tournamentName, setTournamentName, errors }: any) {
  return (
    <>
      <FieldLabel text="Banner do torneio" color={labelColor} required={required} />
      <Pressable onPress={onPickBanner} style={{ height: 120, borderRadius: 18, overflow: "hidden", marginBottom: 18, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent" }}>
        <Image source={{ uri: bannerUri || BANNER_IMAGE }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
        <View style={{
          position: "absolute", top: 9, right: 9,
          flexDirection: "row", alignItems: "center", gap: 5,
          backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20,
        }}>
          <Icon name="edit" size={12} color="#fff" strokeWidth={2.4} />
          <Text style={{ color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700" }}>Editar</Text>
        </View>
      </Pressable>

      <FieldLabel text="Nome do torneio" isRequired color={labelColor} required={required} />
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: inputBg, borderWidth: 1, borderColor: errors?.name ? "#FF4D5E" : inputBorder,
        borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Icon name="trophy" size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} />
        <TextInput
          value={tournamentName}
          onChangeText={setTournamentName}
          style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 14, padding: 0 }}
          placeholder="Copa Verão 2026"
          placeholderTextColor={isDark ? "#8A83A0" : "#9A94AC"}
        />
      </View>
      <FieldError text={errors?.name} />
      <View style={{ marginBottom: errors?.name ? 4 : 16 }} />

      <FieldLabel text="Descrição" color={labelColor} required={required} />
      <View style={{
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, marginBottom: 18, minHeight: 72,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <TextInput
          multiline
          style={{ color: isDark ? "#8A83A0" : "#9A94AC", fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19.5, padding: 0 }}
          placeholder="Torneio de vôlei de praia com duplas e quartetos, aberto a todos os níveis…"
          placeholderTextColor={isDark ? "#8A83A0" : "#9A94AC"}
        />
      </View>

      <FieldLabel text="Tipo de evento" color={labelColor} required={required} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {([["unique", "Evento único", "1 data"], ["circuit", "Circuito", "Várias etapas"]] as const).map(([key, label, sub]) => {
          const isActive = selectedType === key;
          return (
            <Pressable key={key} onPress={() => setSelectedType(key)} style={{
              flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center",
              backgroundColor: isActive ? "#C6F82A" : (isDark ? "#171221" : "#fff"),
              ...(isActive
                ? (isDark ? {} : { shadowColor: "rgba(198,248,42,0.5)", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 })
                : { borderWidth: 1, borderColor: inputBorder, ...(isDark ? {} : {}) }),
            }}>
              <Text style={{ color: isActive ? "#12100A" : textPrimary, fontFamily: "Oswald_700Bold", fontSize: 13, fontWeight: "700" }}>{label}</Text>
              <Text style={{ color: isActive ? "rgba(18,16,10,0.65)" : (isDark ? "#A9A2BC" : "#6B6480"), fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Step2Structure({ isDark, inputBg, inputBorder, labelColor, textPrimary, required, accentColor, selectedFacilities, setSelectedFacilities, date, setDate, time, setTime, cep, setCep, number, setNumber, complement, setComplement, address, setAddress, maxTeams, setMaxTeams, allowSameAthlete, setAllowSameAthlete, selectedType, referees, refereeEmail, setRefereeEmail, addingReferee, onAddReferee, onRemoveReferee, isEditing, cardBg, cardBorder, pendingReferees, setPendingReferees, errors }: any) {
  const [loadingCep, setLoadingCep] = useState(false);

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
        const parts = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean);
        setAddress(parts.join(", "));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível buscar o CEP.");
    } finally {
      setLoadingCep(false);
    }
  };

  const toggleFacility = (f: string) => {
    setSelectedFacilities((prev: string[]) => prev.includes(f) ? prev.filter((x: string) => x !== f) : [...prev, f]);
  };

  const inputStyle = {
    backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
  };
  const textStyle = { color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 };

  return (
    <>
      <Text style={{ color: textPrimary, fontFamily: "Oswald_700Bold", fontSize: 13, fontWeight: "700", letterSpacing: 0.04 * 13, marginBottom: 12 }}>LOCALIZAÇÃO</Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Data" isRequired color={labelColor} required={required} />
          <DateTimeField pattern="dd/MM/yy" value={date} onChange={setDate} placeholder="dd/mm/aa" accessibilityLabel="Data do torneio">
            {({ text, isEmpty }) => (
              <View style={{ ...inputStyle, borderColor: errors?.date ? "#FF4D5E" : inputBorder, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="calendar" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
                <Text style={{ ...textStyle, flex: 1, color: isEmpty ? (isDark ? "#6E6684" : "#8A829E") : textStyle.color }}>{text}</Text>
              </View>
            )}
          </DateTimeField>
          <FieldError text={errors?.date} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Horário" color={labelColor} required={required} />
          <DateTimeField pattern="HH:mm" value={time} onChange={setTime} placeholder="hh:mm" accessibilityLabel="Horário do torneio">
            {({ text, isEmpty }) => (
              <View style={{ ...inputStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="clock" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
                <Text style={{ ...textStyle, flex: 1, color: isEmpty ? (isDark ? "#6E6684" : "#8A829E") : textStyle.color }}>{text}</Text>
              </View>
            )}
          </DateTimeField>
        </View>
      </View>

      <FieldLabel text="CEP" isRequired color={labelColor} required={required} />
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        ...inputStyle, borderColor: errors?.cep ? "#FF4D5E" : inputBorder, paddingHorizontal: 15,
      }}>
        <Icon name="location" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
        <TextInput value={cep} onChangeText={(v) => setCep(maskCep(v))} maxLength={9} style={{ ...textStyle, flex: 1, fontSize: 14 }} placeholder="00000-000" placeholderTextColor={isDark ? "#6E6684" : "#8A829E"} keyboardType="numeric" />
        <Pressable onPress={handleSearchCep} disabled={loadingCep} accessibilityRole="button" accessibilityLabel="Buscar CEP">
          {loadingCep ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Text style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700" }}>Buscar</Text>
          )}
        </Pressable>
      </View>
      <FieldError text={errors?.cep} />
      <View style={{ marginBottom: errors?.cep ? 4 : 14 }} />

      {address ? (
        <View style={{ ...inputStyle, paddingHorizontal: 15, marginBottom: 14, marginTop: -6 }}>
          <Text style={{ ...textStyle, fontSize: 13, color: isDark ? "#CFC8E0" : "#4A4460" }}>{address}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Número" isRequired color={labelColor} required={required} />
          <TextInput value={number} onChangeText={setNumber} style={{ ...inputStyle, ...textStyle, borderColor: errors?.number ? "#FF4D5E" : inputBorder, fontSize: 14 }} placeholder="Nº" placeholderTextColor={isDark ? "#6E6684" : "#8A829E"} keyboardType="numeric" />
          <FieldError text={errors?.number} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Complemento" color={labelColor} required={required} />
          <TextInput value={complement} onChangeText={setComplement} style={{ ...inputStyle, ...textStyle, fontSize: 14 }} placeholder="Quadra, bloco..." placeholderTextColor={isDark ? "#6E6684" : "#8A829E"} />
        </View>
      </View>

      <FieldLabel text="Máx. times" color={labelColor} required={required} />
      <TextInput value={maxTeams} onChangeText={setMaxTeams} style={{ ...inputStyle, ...textStyle, fontSize: 14, paddingHorizontal: 15, marginBottom: 14 }} placeholder="16" placeholderTextColor={isDark ? "#6E6684" : "#8A829E"} keyboardType="numeric" />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textPrimary, fontFamily: "Oswald_600SemiBold", fontSize: 13, letterSpacing: 0.6 }}>
            Atleta em mais de um time
          </Text>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 11, lineHeight: 16, marginTop: 2 }}>
            {selectedType === "circuit"
              ? "Permite que o mesmo atleta jogue por times diferentes entre as etapas."
              : "Permite que o mesmo atleta se inscreva por mais de um time neste torneio."}
          </Text>
        </View>
        <Toggle value={allowSameAthlete} onValueChange={setAllowSameAthlete} />
      </View>

      <FieldLabel text="Instalações" color={labelColor} required={required} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FACILITIES.map((f) => {
          const active = selectedFacilities.includes(f);
          return (
            <Pressable key={f} onPress={() => toggleFacility(f)} style={{
              paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
              backgroundColor: active ? (isDark ? "rgba(124,58,237,0.18)" : "#EEE6FB") : (isDark ? "#171221" : "#fff"),
              borderWidth: 1,
              borderColor: active ? "rgba(124,58,237,0.4)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.12)"),
            }}>
              <Text style={{
                color: active ? "#7C3AED" : (isDark ? "#A9A2BC" : "#6B6480"),
                fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700",
              }}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Árbitros */}
      <Text style={{ color: textPrimary, fontFamily: "Oswald_700Bold", fontSize: 13, fontWeight: "700", letterSpacing: 0.04 * 13, marginTop: 28, marginBottom: 12 }}>ÁRBITROS</Text>

      {isEditing ? (
        <>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            ...inputStyle, paddingHorizontal: 15, marginBottom: 14,
          }}>
            <Icon name="user" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
            <TextInput
              value={refereeEmail}
              onChangeText={setRefereeEmail}
              style={{ ...textStyle, flex: 1, fontSize: 14 }}
              placeholder="Email do árbitro"
              placeholderTextColor={isDark ? "#6E6684" : "#8A829E"}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable onPress={onAddReferee} disabled={addingReferee} accessibilityRole="button" accessibilityLabel="Adicionar árbitro">
              {addingReferee ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <Text style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700" }}>Adicionar</Text>
              )}
            </Pressable>
          </View>

          {referees.length > 0 ? (
            <View style={{ gap: 8 }}>
              {referees.map((ref: any) => (
                <View key={ref.id} style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
                  borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
                }}>
                  {ref.user?.avatarUrl ? (
                    <Image source={{ uri: ref.user.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 10 }} />
                  ) : (
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "#241B38" : "#F0ECFA", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Oswald_700Bold", fontSize: 12 }}>
                        {ref.user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??"}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textPrimary, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{ref.user?.name || "Árbitro"}</Text>
                    <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 11 }}>{ref.user?.email || ""}</Text>
                  </View>
                  <Pressable onPress={() => onRemoveReferee(ref.id)} hitSlop={8} accessibilityLabel="Remover árbitro">
                    <Icon name="trash" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
              Nenhum árbitro adicionado ainda.
            </Text>
          )}
        </>
      ) : (
        <>
          {/* Create flow: collect referee emails locally, added after the tournament is saved */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            ...inputStyle, paddingHorizontal: 15, marginBottom: 12,
          }}>
            <Icon name="user" size={15} color="#8B5CF6" />
            <TextInput
              value={refereeEmail}
              onChangeText={setRefereeEmail}
              onSubmitEditing={() => {
                const e = refereeEmail.trim();
                if (e && !pendingReferees.includes(e)) { setPendingReferees((p: string[]) => [...p, e]); setRefereeEmail(""); }
              }}
              returnKeyType="done"
              style={{ ...textStyle, flex: 1, fontSize: 14 }}
              placeholder="Email do árbitro"
              placeholderTextColor="#6E6684"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable onPress={() => {
              const e = refereeEmail.trim();
              if (e && !pendingReferees.includes(e)) { setPendingReferees((p: string[]) => [...p, e]); setRefereeEmail(""); }
            }} accessibilityRole="button" accessibilityLabel="Adicionar árbitro">
              <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}>Adicionar</Text>
            </Pressable>
          </View>

          {pendingReferees.length > 0 ? (
            <View style={{ gap: 8 }}>
              {pendingReferees.map((email: string) => (
                <View key={email} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#241B38", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="user" size={15} color="#8B5CF6" />
                  </View>
                  <Text style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}>{email}</Text>
                  <Pressable onPress={() => setPendingReferees((p: string[]) => p.filter((x) => x !== email))} hitSlop={8} accessibilityLabel="Remover árbitro">
                    <Icon name="close" size={16} color="#6E6684" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
              Adicione os emails dos árbitros. Eles serão convidados quando o torneio for salvo.
            </Text>
          )}
        </>
      )}
    </>
  );
}

function Step3Categories({ isDark, labelColor, textPrimary, required, accentColor, selectedGender, setSelectedGender, selectedModality, setSelectedModality, selectedFormat, setSelectedFormat, selectedSets, setSelectedSets, selectedSemiSets, setSelectedSemiSets, selectedFinalSets, setSelectedFinalSets, inactivePill, inactivePillText, cardBg, cardBorder, inputBg, inputBorder, categoryPrice, setCategoryPrice, categoryDeadline, setCategoryDeadline, sponsors, setSponsors, sponsorInput, setSponsorInput, categories, onAddCategory, onRemoveCategory }: any) {
  const fieldInputStyle = {
    backgroundColor: isDark ? "#0E0B14" : "#F6F4FC", borderWidth: 1, borderColor: inputBorder,
    borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12,
  };
  const fieldTextStyle = { color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 };

  return (
    <>
      {categories.map((cat: any, idx: number) => (
        <View key={cat.id} style={{
          backgroundColor: cardBg, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)",
          borderRadius: 18, padding: 15, marginBottom: 14,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 }),
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: accentColor, fontFamily: "Oswald_700Bold", fontSize: 11, fontWeight: "700", letterSpacing: 0.04 * 11 }}>CATEGORIA {idx + 1}</Text>
            <Pressable onPress={() => onRemoveCategory(cat.id)} hitSlop={8}>
              <Icon name="trash" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
            </Pressable>
          </View>

          <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Tipo</Text>
          <PillGroup options={["Masculino", "Feminino", "Misto"]} selected={selectedGender} onSelect={setSelectedGender} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} />

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Modalidade</Text>
              <PillGroup options={["Areia", "Quadra"]} selected={selectedModality} onSelect={setSelectedModality} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} small />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Formato</Text>
              <PillGroup options={["Dupla", "Quarteto"]} selected={selectedFormat} onSelect={setSelectedFormat} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} small />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Valor (R$)</Text>
              <View style={{ ...fieldInputStyle, flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Text style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>R$</Text>
                <TextInput value={categoryPrice} onChangeText={setCategoryPrice} style={{ ...fieldTextStyle, flex: 1 }} placeholder="0,00" placeholderTextColor={isDark ? "#6E6684" : "#8A829E"} keyboardType="numeric" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Prazo insc.</Text>
              <DateTimeField pattern="dd/MM/yy" value={categoryDeadline} onChange={setCategoryDeadline} placeholder="dd/mm/aa" accessibilityLabel="Prazo de inscrição">
                {({ text, isEmpty }) => (
                  <Text style={{ ...fieldInputStyle, ...fieldTextStyle, color: isEmpty ? (isDark ? "#6E6684" : "#8A829E") : fieldTextStyle.color }}>{text}</Text>
                )}
              </DateTimeField>
            </View>
          </View>

          <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Melhor de (fase de grupos / mata-mata)</Text>
          <PillGroup options={["1 set", "3 sets", "5 sets"]} selected={selectedSets} onSelect={setSelectedSets} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Semifinal</Text>
              <PillGroup options={["Igual", "3 sets", "5 sets"]} selected={selectedSemiSets} onSelect={setSelectedSemiSets} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} small />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Final</Text>
              <PillGroup options={["Igual", "3 sets", "5 sets"]} selected={selectedFinalSets} onSelect={setSelectedFinalSets} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} small />
            </View>
          </View>
          <Text style={{ color: labelColor, fontFamily: "Manrope_400Regular", fontSize: 10.5, lineHeight: 15, marginTop: -4 }}>
            "Igual" usa o mesmo número de sets da fase anterior. O árbitro contabiliza automaticamente conforme a fase.
          </Text>
        </View>
      ))}

      <Pressable onPress={onAddCategory} style={{
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        borderWidth: 1, borderStyle: "dashed",
        borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(124,58,237,0.4)",
        borderRadius: 14, paddingVertical: 13, marginBottom: 20,
      }}>
        <Icon name="plus" size={17} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2.4} />
        <Text style={{ color: isDark ? "#CFC8E0" : "#7C3AED", fontFamily: "Oswald_700Bold", fontSize: 12, fontWeight: "700" }}>Adicionar categoria</Text>
      </Pressable>

      <Text style={{ color: textPrimary, fontFamily: "Oswald_700Bold", fontSize: 13, fontWeight: "700", letterSpacing: 0.04 * 13, marginBottom: 10 }}>PATROCINADORES</Text>
      {sponsors.map((s: string, i: number) => (
        <View key={i} style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
          borderRadius: 14, paddingVertical: 10, paddingHorizontal: 15, marginBottom: 8,
          ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
        }}>
          <Icon name="external" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
          <Text style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13 }}>{s}</Text>
          <Pressable onPress={() => setSponsors((prev: string[]) => prev.filter((_: string, j: number) => j !== i))} hitSlop={8}>
            <Icon name="close" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
          </Pressable>
        </View>
      ))}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Icon name="external" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
        <TextInput
          value={sponsorInput}
          onChangeText={setSponsorInput}
          onSubmitEditing={() => {
            const trimmed = sponsorInput.trim();
            if (trimmed) { setSponsors((prev: string[]) => [...prev, trimmed]); setSponsorInput(""); }
          }}
          returnKeyType="done"
          style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, padding: 0 }}
          placeholder="Nome do patrocinador"
          placeholderTextColor={isDark ? "#8A83A0" : "#9A94AC"}
        />
        <Pressable onPress={() => {
          const trimmed = sponsorInput.trim();
          if (trimmed) { setSponsors((prev: string[]) => [...prev, trimmed]); setSponsorInput(""); }
        }}>
          <Icon name="plus" size={18} color={accentColor} strokeWidth={2.4} />
        </Pressable>
      </View>
    </>
  );
}

function Step4Review({ isDark, cardBg, cardBorder, accentColor, labelColor, textPrimary, onEdit, tournamentName, tournamentDate, tournamentAddress, maxTeams, categoryPrice, selectedGender, selectedModality, selectedFormat, selectedSets, selectedType, categories, bannerUri }: any) {
  const displayName = tournamentName || "Novo Torneio";
  const typeLabel = selectedType === "circuit" ? "CIRCUITO" : "EVENTO ÚNICO";
  const categoryCount = categories?.length ?? 1;

  const addressParts = tournamentAddress ? tournamentAddress.split(", ") : [];
  const cityState = addressParts.length >= 3 ? addressParts[addressParts.length - 1] : "";
  const subtitle = [tournamentDate, cityState, `máx. ${maxTeams || "?"} times`].filter(Boolean).join(" · ");

  const priceDisplay = categoryPrice ? `R$ ${categoryPrice}` : "Gratuito";

  return (
    <>
      <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginBottom: 12 }}>Confira antes de publicar. É assim que o card aparece:</Text>

      <View style={{ borderRadius: 20, overflow: "hidden", height: 150, marginBottom: 16, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent" }}>
        <Image source={{ uri: bannerUri || BANNER_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
        <LinearGradient colors={["rgba(6,4,12,0.15)", "rgba(6,4,12,0.85)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 11, left: 11, backgroundColor: "#C6F82A", paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8 }}>
          <Text style={{ color: "#12100A", fontFamily: "Oswald_700Bold", fontSize: 9, fontWeight: "700" }}>{typeLabel}</Text>
        </View>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14 }}>
          <Text style={{ color: "#fff", fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase" }}>{displayName}</Text>
          <Text style={{ color: isDark ? "#CFC8E0" : "rgba(255,255,255,0.85)", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 3 }}>{subtitle}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {[
          { value: "1", label: "Etapa" },
          { value: String(categoryCount), label: categoryCount === 1 ? "Categoria" : "Categorias" },
          { value: maxTeams || "?", label: "Vagas" },
        ].map((s) => (
          <View key={s.label} style={{
            flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
            borderRadius: 14, paddingVertical: 12, alignItems: "center",
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
          }}>
            <Text style={{ color: "#C6F82A", fontFamily: "Anton_400Regular", fontSize: 20, fontWeight: "700" }}>{s.value}</Text>
            <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_600SemiBold", fontSize: 10, fontWeight: "600", marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{
        backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
        borderRadius: 14, padding: 14,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{selectedGender} · {selectedModality} · {selectedFormat}</Text>
          <Text style={{ color: textPrimary, fontFamily: "Manrope_700Bold", fontSize: 12, fontWeight: "700" }}>{priceDisplay}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)", marginVertical: 2 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>{selectedSets}</Text>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_700Bold", fontSize: 12, fontWeight: "700" }}>Editar</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function PillGroup({ options, selected, onSelect, isDark, inactivePill, inactivePillText, small }: { options: string[]; selected: string; onSelect: (v: string) => void; isDark: boolean; inactivePill: string; inactivePillText: string; small?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: small ? 6 : 7, marginBottom: 12 }}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <Pressable key={opt} onPress={() => onSelect(opt)} style={{
            flex: 1, alignItems: "center",
            paddingVertical: small ? 8 : 9, borderRadius: small ? 10 : 11,
            backgroundColor: isActive ? "#C6F82A" : inactivePill,
          }}>
            <Text style={{
              color: isActive ? "#12100A" : inactivePillText,
              fontFamily: "Oswald_700Bold", fontSize: small ? 11 : 12, fontWeight: "700",
            }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
