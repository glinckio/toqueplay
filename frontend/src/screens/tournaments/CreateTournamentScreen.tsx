import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "@/components/ui/Icon";

const STEPS = ["Básico", "Estrutura", "Categorias", "Revisão"];
const BANNER_IMAGE = "https://images.unsplash.com/photo-1748645288738-aadf398bcd3e?fm=jpg&w=680&q=68&auto=format&fit=crop";

const FACILITIES = ["Estacionamento", "Banheiros", "Cantina", "Vestiário"];

export function CreateTournamentScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [step, setStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const bgBase = isDark ? "#0E0B14" : "#F6F4FC";
  const inputBg = isDark ? "#171221" : "#fff";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(26,16,48,0.1)";
  const labelColor = isDark ? "#A9A2BC" : "#6B6480";
  const textPrimary = isDark ? "#F5F3FA" : "#1A1428";
  const inactivePill = isDark ? "#241B38" : "#F0ECFA";
  const inactivePillText = isDark ? "#CFC8E0" : "#4A4460";
  const progressInactive = isDark ? "#241B38" : "#E4DEF2";
  const stepInactive = isDark ? "#6E6684" : "#A29CB4";
  const backBtnBg = isDark ? "#1C1630" : "#fff";
  const backBtnBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";
  const required = isDark ? "#C6F82A" : "#7C3AED";
  const cardBg = isDark ? "#171221" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)";

  const [selectedType, setSelectedType] = useState<"unique" | "circuit">("unique");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(["Estacionamento", "Banheiros"]);
  const [selectedGender, setSelectedGender] = useState("Masculino");
  const [selectedModality, setSelectedModality] = useState("Areia");
  const [selectedFormat, setSelectedFormat] = useState("Dupla");
  const [selectedSets, setSelectedSets] = useState("3 sets");

  if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: bgBase }}>
        <Image source={{ uri: BANNER_IMAGE }} style={{ position: "absolute", width: "100%", height: 340, opacity: 0.5 }} resizeMode="cover" />
        <LinearGradient
          colors={isDark ? ["rgba(14,11,20,0.4)", "#0E0B14"] : ["rgba(246,244,252,0.4)", "#F6F4FC"]}
          locations={[0, 0.52]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
          <View style={{
            width: 96, height: 96, borderRadius: 32,
            backgroundColor: isDark ? "rgba(198,248,42,0.15)" : "rgba(124,58,237,0.1)",
            borderWidth: 1, borderColor: isDark ? "rgba(198,248,42,0.35)" : "rgba(124,58,237,0.3)",
            alignItems: "center", justifyContent: "center", marginBottom: 28,
          }}>
            <Icon name="check" size={48} color={accentColor} strokeWidth={2.2} />
          </View>
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 12, fontWeight: "600", letterSpacing: 0.14 * 10, marginBottom: 10 }}>TUDO PRONTO</Text>
          <Text style={{ color: textPrimary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 30, fontWeight: "700", letterSpacing: -0.02 * 30, lineHeight: 32, textAlign: "center", marginBottom: 12 }}>{"Torneio\npublicado!"}</Text>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500", lineHeight: 20.8, textAlign: "center", maxWidth: 280, marginBottom: 40 }}>
            A <Text style={{ color: textPrimary, fontFamily: "Manrope_700Bold", fontWeight: "700" }}>Copa Verão 2026</Text> já está no ar. As inscrições estão abertas e os atletas por perto foram avisados.
          </Text>
          <Pressable style={{
            width: "100%", paddingVertical: 16, borderRadius: 16, backgroundColor: accentColor, alignItems: "center", marginBottom: 12,
            ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
          }}>
            <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>VER TORNEIO</Text>
          </Pressable>
          <Pressable style={{
            width: "100%", paddingVertical: 14, borderRadius: 16,
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(26,16,48,0.16)",
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Icon name="share" size={16} color={isDark ? "#CFC8E0" : "#4A4460"} />
            <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Compartilhar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bgBase }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <Pressable
              onPress={() => step > 0 ? setStep(step - 1) : navigation?.goBack()}
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
              <Text style={{ color: textPrimary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 19, fontWeight: "700", letterSpacing: -0.01 * 19 }}>Criar torneio</Text>
              <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>Passo {step + 1} de 4</Text>
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

        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {step === 0 && <Step1Basic isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} selectedType={selectedType} setSelectedType={setSelectedType} inactivePill={inactivePill} inactivePillText={inactivePillText} />}
          {step === 1 && <Step2Structure isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} accentColor={accentColor} selectedFacilities={selectedFacilities} setSelectedFacilities={setSelectedFacilities} />}
          {step === 2 && <Step3Categories isDark={isDark} inputBg={inputBg} inputBorder={inputBorder} labelColor={labelColor} textPrimary={textPrimary} required={required} accentColor={accentColor} selectedGender={selectedGender} setSelectedGender={setSelectedGender} selectedModality={selectedModality} setSelectedModality={setSelectedModality} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} selectedSets={selectedSets} setSelectedSets={setSelectedSets} inactivePill={inactivePill} inactivePillText={inactivePillText} cardBg={cardBg} cardBorder={cardBorder} />}
          {step === 3 && <Step4Review isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} accentColor={accentColor} labelColor={labelColor} textPrimary={textPrimary} />}
        </ScrollView>

        {/* Footer */}
        <LinearGradient
          colors={isDark ? ["rgba(14,11,20,0)", bgBase] : ["rgba(246,244,252,0)", bgBase]}
          locations={[0, 0.3]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 26, flexDirection: step < 3 ? "row" : "column", gap: step < 3 ? 12 : 10 }}
        >
          {step < 3 ? (
            <>
              <Pressable onPress={() => step > 0 ? setStep(step - 1) : navigation?.goBack()} style={{
                paddingVertical: 15, paddingHorizontal: 22, borderRadius: 16,
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(26,16,48,0.16)",
              }}>
                <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Voltar</Text>
              </Pressable>
              <Pressable onPress={() => setStep(step + 1)} style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                paddingVertical: 15, borderRadius: 16, backgroundColor: accentColor,
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}>
                <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700" }}>Continuar</Text>
                <Icon name="chevron-right" size={16} color={isDark ? "#12100A" : "#fff"} strokeWidth={2.6} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => setShowSuccess(true)} style={{
                width: "100%", paddingVertical: 16, borderRadius: 16, backgroundColor: accentColor, alignItems: "center",
                ...(isDark ? {} : { shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 }),
              }}>
                <Text style={{ color: isDark ? "#12100A" : "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 14, fontWeight: "700", letterSpacing: 0.03 * 14 }}>PUBLICAR TORNEIO</Text>
              </Pressable>
              <Pressable style={{
                width: "100%", paddingVertical: 13, borderRadius: 16,
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(26,16,48,0.16)",
                alignItems: "center",
              }}>
                <Text style={{ color: isDark ? "#CFC8E0" : "#4A4460", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>Salvar como rascunho</Text>
              </Pressable>
            </>
          )}
        </LinearGradient>
      </KeyboardAvoidingView>
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

function Step1Basic({ isDark, inputBg, inputBorder, labelColor, textPrimary, required, selectedType, setSelectedType, inactivePill, inactivePillText }: any) {
  return (
    <>
      <FieldLabel text="Banner do torneio" color={labelColor} required={required} />
      <View style={{ height: 120, borderRadius: 18, overflow: "hidden", marginBottom: 18, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent" }}>
        <Image source={{ uri: BANNER_IMAGE }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{
          position: "absolute", top: 9, right: 9,
          flexDirection: "row", alignItems: "center", gap: 5,
          backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20,
        }}>
          <Icon name="edit" size={12} color="#fff" strokeWidth={2.4} />
          <Text style={{ color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700" }}>Editar</Text>
        </View>
      </View>

      <FieldLabel text="Nome do torneio" isRequired color={labelColor} required={required} />
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, marginBottom: 16,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Icon name="trophy" size={16} color={isDark ? "#8B5CF6" : "#7C3AED"} />
        <TextInput
          style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 14, padding: 0 }}
          placeholder="Copa Verão 2026"
          placeholderTextColor={isDark ? "#8A83A0" : "#9A94AC"}
          defaultValue="Copa Verão 2026"
        />
      </View>

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
              backgroundColor: isActive ? "#7C3AED" : (isDark ? "#171221" : "#fff"),
              ...(isActive
                ? (isDark ? {} : { shadowColor: "rgba(124,58,237,0.7)", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 })
                : { borderWidth: 1, borderColor: inputBorder, ...(isDark ? {} : {}) }),
            }}>
              <Text style={{ color: isActive ? "#fff" : textPrimary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700" }}>{label}</Text>
              <Text style={{ color: isActive ? "rgba(255,255,255,0.7)" : (isDark ? "#A9A2BC" : "#6B6480"), fontFamily: "Manrope_500Medium", fontSize: 10, fontWeight: "500", marginTop: 2 }}>{sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Step2Structure({ isDark, inputBg, inputBorder, labelColor, textPrimary, required, accentColor, selectedFacilities, setSelectedFacilities }: any) {
  const toggleFacility = (f: string) => {
    setSelectedFacilities((prev: string[]) => prev.includes(f) ? prev.filter((x: string) => x !== f) : [...prev, f]);
  };

  return (
    <>
      <Text style={{ color: textPrimary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700", letterSpacing: 0.04 * 13, marginBottom: 12 }}>LOCALIZAÇÃO</Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Data" isRequired color={labelColor} required={required} />
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
          }}>
            <Icon name="calendar" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
            <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>12/07/26</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Horário" color={labelColor} required={required} />
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
          }}>
            <Icon name="clock" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
            <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>08:00</Text>
          </View>
        </View>
      </View>

      <FieldLabel text="CEP" color={labelColor} required={required} />
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 14,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Icon name="location" size={15} color={isDark ? "#8B5CF6" : "#7C3AED"} />
        <Text style={{ flex: 1, color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500" }}>11700-000</Text>
        <Text style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700" }}>Buscar</Text>
      </View>

      <View style={{
        backgroundColor: isDark ? "rgba(198,248,42,0.06)" : "rgba(124,58,237,0.05)",
        borderWidth: 1, borderColor: isDark ? "rgba(198,248,42,0.12)" : "rgba(124,58,237,0.12)",
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 14,
      }}>
        <Text style={{ color: accentColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 2 }}>Endereço encontrado</Text>
        <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>Av. Beira-Mar · Praia Grande, SP</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Número" isRequired color={labelColor} required={required} />
          <View style={{
            backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
          }}>
            <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500" }}>1200</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Complemento" color={labelColor} required={required} />
          <View style={{
            backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
          }}>
            <Text style={{ color: isDark ? "#6E6684" : "#8A829E", fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500" }}>Quadra 3</Text>
          </View>
        </View>
      </View>

      <FieldLabel text="Máx. times" color={labelColor} required={required} />
      <View style={{
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 14,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 14, fontWeight: "500" }}>16</Text>
      </View>

      <FieldLabel text="Instalações" color={labelColor} required={required} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FACILITIES.map((f) => {
          const active = selectedFacilities.includes(f);
          return (
            <Pressable key={f} onPress={() => toggleFacility(f)} style={{
              paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
              backgroundColor: active ? (isDark ? "rgba(198,248,42,0.14)" : "#EEE6FB") : (isDark ? "#171221" : "#fff"),
              borderWidth: 1,
              borderColor: active ? (isDark ? "rgba(198,248,42,0.4)" : "rgba(124,58,237,0.3)") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.12)"),
            }}>
              <Text style={{
                color: active ? accentColor : (isDark ? "#A9A2BC" : "#6B6480"),
                fontFamily: "Manrope_700Bold", fontSize: 11, fontWeight: "700",
              }}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Step3Categories({ isDark, labelColor, textPrimary, required, accentColor, selectedGender, setSelectedGender, selectedModality, setSelectedModality, selectedFormat, setSelectedFormat, selectedSets, setSelectedSets, inactivePill, inactivePillText, cardBg, cardBorder, inputBg, inputBorder }: any) {
  return (
    <>
      <View style={{
        backgroundColor: cardBg, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)",
        borderRadius: 18, padding: 15, marginBottom: 14,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 }),
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, fontWeight: "700", letterSpacing: 0.04 * 11 }}>CATEGORIA 1</Text>
          <Icon name="trash" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
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
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 7,
              backgroundColor: isDark ? "#0E0B14" : "#F6F4FC", borderWidth: 1, borderColor: inputBorder,
              borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12,
            }}>
              <Text style={{ color: accentColor, fontFamily: "Manrope_700Bold", fontSize: 13, fontWeight: "700" }}>R$</Text>
              <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>120,00</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Prazo insc.</Text>
            <View style={{
              backgroundColor: isDark ? "#0E0B14" : "#F6F4FC", borderWidth: 1, borderColor: inputBorder,
              borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12,
            }}>
              <Text style={{ color: textPrimary, fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>05/07/26</Text>
            </View>
          </View>
        </View>

        <Text style={{ color: labelColor, fontFamily: "Manrope_600SemiBold", fontSize: 11, fontWeight: "600", marginBottom: 7 }}>Melhor de</Text>
        <PillGroup options={["1 set", "3 sets", "5 sets"]} selected={selectedSets} onSelect={setSelectedSets} isDark={isDark} inactivePill={inactivePill} inactivePillText={inactivePillText} />
      </View>

      <Pressable style={{
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        borderWidth: 1, borderStyle: "dashed",
        borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(124,58,237,0.4)",
        borderRadius: 14, paddingVertical: 13, marginBottom: 20,
      }}>
        <Icon name="plus" size={17} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2.4} />
        <Text style={{ color: isDark ? "#CFC8E0" : "#7C3AED", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12, fontWeight: "700" }}>Adicionar categoria</Text>
      </Pressable>

      <Text style={{ color: textPrimary, fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, fontWeight: "700", letterSpacing: 0.04 * 13, marginBottom: 10 }}>PATROCINADORES</Text>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15,
        ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.22)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }),
      }}>
        <Icon name="external" size={16} color={isDark ? "#6E6684" : "#A29CB4"} />
        <Text style={{ color: isDark ? "#8A83A0" : "#9A94AC", fontFamily: "Manrope_500Medium", fontSize: 13, fontWeight: "500" }}>Nome do patrocinador</Text>
      </View>
    </>
  );
}

function Step4Review({ isDark, cardBg, cardBorder, accentColor, labelColor, textPrimary }: any) {
  return (
    <>
      <Text style={{ color: labelColor, fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500", marginBottom: 12 }}>Confira antes de publicar. É assim que o card aparece:</Text>

      <View style={{ borderRadius: 20, overflow: "hidden", height: 150, marginBottom: 16, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent" }}>
        <Image source={{ uri: BANNER_IMAGE }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient colors={["rgba(6,4,12,0.15)", "rgba(6,4,12,0.85)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 11, left: 11, backgroundColor: "#C6F82A", paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8 }}>
          <Text style={{ color: "#12100A", fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, fontWeight: "700" }}>EVENTO ÚNICO</Text>
        </View>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14 }}>
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 19, fontWeight: "700", letterSpacing: -0.01 * 19 }}>Copa Verão 2026</Text>
          <Text style={{ color: isDark ? "#CFC8E0" : "rgba(255,255,255,0.85)", fontFamily: "Manrope_500Medium", fontSize: 11, fontWeight: "500", marginTop: 3 }}>12 jul · Praia Grande, SP · máx. 16 times</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {[
          { value: "1", label: "Etapa" },
          { value: "1", label: "Categoria" },
          { value: "16", label: "Vagas" },
        ].map((s) => (
          <View key={s.label} style={{
            flex: 1, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder,
            borderRadius: 14, paddingVertical: 12, alignItems: "center",
            ...(isDark ? {} : { shadowColor: "rgba(46,16,101,0.3)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4 }),
          }}>
            <Text style={{ color: accentColor, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, fontWeight: "700" }}>{s.value}</Text>
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
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>Masculino · Areia · Dupla</Text>
          <Text style={{ color: textPrimary, fontFamily: "Manrope_700Bold", fontSize: 12, fontWeight: "700" }}>R$ 120,00</Text>
        </View>
        <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.07)", marginVertical: 2 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
          <Text style={{ color: isDark ? "#A9A2BC" : "#6B6480", fontFamily: "Manrope_500Medium", fontSize: 12, fontWeight: "500" }}>Melhor de 3 · final melhor de 5</Text>
          <Text style={{ color: isDark ? "#8B5CF6" : "#7C3AED", fontFamily: "Manrope_700Bold", fontSize: 12, fontWeight: "700" }}>Editar</Text>
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
            backgroundColor: isActive ? "#7C3AED" : inactivePill,
          }}>
            <Text style={{
              color: isActive ? "#fff" : inactivePillText,
              fontFamily: "SpaceGrotesk_700Bold", fontSize: small ? 11 : 12, fontWeight: "700",
            }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
