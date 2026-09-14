import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  TextInput,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";
import { teamsService } from "@/services/teamsService";
import { getErrorMessage } from "@/services/api";
import { Banner } from "@/components/ui/Banner";
import { CelebrationScreen, NotchedPanel, NotchedButton } from "@/components/ui/CelebrationScreen";
import { useTC } from "../tournaments/_tournamentKit";
import { formatCPF, unformatCPF } from "@/utils/cpf";

function BackButton({ onPress }: { onPress: () => void }) {
  const TC = useTC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.cardBorder, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name="back" size={19} color={TC.tx2} strokeWidth={2.2} />
    </Pressable>
  );
}

export function AddTeamMemberScreen({ navigation, route }: any) {
  const TC = useTC();
  const teamId = route?.params?.teamId as string;
  const teamName = route?.params?.teamName ?? "";
  const teamInitials = teamName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // O dono nem sempre sabe com qual e-mail o atleta se cadastrou — o CPF e obrigatorio no
  // cadastro, entao serve como segunda via de busca.
  const [modo, setModo] = useState<"email" | "cpf">("email");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const porEmail = modo === "email";
  const identidadeOk = porEmail ? email.trim().includes("@") : unformatCPF(cpf).length === 11;
  const canSubmit = identidadeOk && !submitting;
  // O que aparece na tela de sucesso: o que o dono digitou.
  const identidadeDigitada = porEmail ? email.trim() : cpf;

  const trocarModo = (proximo: "email" | "cpf") => {
    setModo(proximo);
    setError("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !teamId) return;
    setError("");
    setSubmitting(true);
    try {
      await teamsService.addMember(
        teamId,
        porEmail ? { email: email.trim() } : { cpf: unformatCPF(cpf) },
      );
      setSuccess(true);
    } catch (err: any) {
      setError(getErrorMessage(err, "Não foi possível convidar este jogador."));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ SUCCESS — celebration dial ============
  if (success) {
    return (
      <CelebrationScreen
        overline="Convite enviado"
        title={"NO CAMINHO\nCERTO"}
        subtitle={
          <>
            <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold" }}>{identidadeDigitada}</Text> foi convidado para o{" "}
            <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Manrope_700Bold" }}>{teamName || "time"}</Text>.
          </>
        }
        ctaLabel="Voltar ao time"
        onCta={() => navigation?.goBack()}
        secondaryLabel="Convidar outro jogador"
        onSecondary={() => { setSuccess(false); setEmail(""); setCpf(""); }}
        accentColor={TC.isDark ? undefined : TC.purple}
        ctaTextColor={TC.isDark ? undefined : "#FFFFFF"}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: TC.lime, backgroundColor: TC.purpleDeep, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-3deg" }] }}>
            <Text style={{ color: TC.lime, fontFamily: "Anton_400Regular", fontSize: 15 }}>{teamInitials || "T"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: TC.tx, fontFamily: "Manrope_700Bold", fontSize: 14 }}>{teamName || "Seu time"}</Text>
            <Text style={{ color: TC.tx2, fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Convite pendente</Text>
          </View>
          <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: TC.limeTintBg }}>
            <Text style={{ color: TC.isDark ? TC.lime : TC.purple, fontFamily: "Oswald_700Bold", fontSize: 9, letterSpacing: 0.6 }}>AGUARDANDO</Text>
          </View>
        </View>
      </CelebrationScreen>
    );
  }

  // ============ INVITE VIEW ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.bg }} edges={["top"]}>
      <StatusBar barStyle={TC.isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <BackButton onPress={() => navigation?.goBack()} />
            <View>
              <Text style={{ color: TC.lime, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 2 }}>
                {teamName || "Seu time"}
              </Text>
              <Text style={{ color: TC.tx, fontFamily: "Anton_400Regular", fontSize: 24, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Convidar jogador
              </Text>
            </View>
          </View>

          {/* Feature panel — ticket-stub, envelope medallion */}
          <NotchedPanel bg={TC.purple}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.22)", borderWidth: 2, borderColor: TC.lime,
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={TC.lime} strokeWidth={2}>
                  <Path d="M4 4h16v16H4z" />
                  <Path d="m4 6 8 7 8-7" />
                </Svg>
              </View>
              <Text style={{ flex: 1, color: TC.tx, fontFamily: "Manrope_600SemiBold", fontSize: 13, lineHeight: 19 }}>
                Busque por email ou CPF quem você quer chamar. Ele recebe um convite e entra assim que aceitar.
              </Text>
            </View>
          </NotchedPanel>

          {!!error && <Banner variant="error" message={error} style={{ marginTop: 20 }} />}

          <View style={{ marginTop: 28 }}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {([["email", "Email"], ["cpf", "CPF"]] as const).map(([key, label]) => {
                const ativo = modo === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => trocarModo(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={`Buscar por ${label}`}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                      borderColor: ativo ? TC.lime : TC.cardBorder,
                      backgroundColor: ativo ? TC.limeTintBg : TC.card,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{
                      color: ativo ? (TC.isDark ? TC.lime : TC.purple) : TC.tx2,
                      fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1.1,
                      textTransform: "uppercase",
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: TC.tx2, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8 }}>
              {porEmail ? "Email do jogador" : "CPF do jogador"}
            </Text>
            <TextInput
              // Sem `key` o RN reaproveita o input entre os modos e o teclado numerico do CPF
              // fica montado ao voltar pro email.
              key={modo}
              value={porEmail ? email : cpf}
              onChangeText={(t) => (porEmail ? setEmail(t) : setCpf(formatCPF(t)))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={porEmail ? "jogador@email.com" : "000.000.000-00"}
              placeholderTextColor={TC.tx3}
              keyboardType={porEmail ? "email-address" : "numeric"}
              autoCapitalize="none"
              style={{
                backgroundColor: TC.card,
                borderWidth: 1.5,
                borderColor: focused ? TC.lime : TC.cardBorder,
                borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                color: TC.tx, fontFamily: "Manrope_500Medium", fontSize: 14,
              }}
              accessibilityLabel={porEmail ? "Email do jogador" : "CPF do jogador"}
            />
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ marginBottom: 24, opacity: canSubmit ? 1 : 0.4 }}>
            <NotchedButton label="Enviar convite" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
