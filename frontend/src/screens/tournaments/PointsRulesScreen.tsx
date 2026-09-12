import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { standingsService, PointsRule } from "@/services/standingsService";
import { getErrorMessage } from "@/services/api";

/**
 * Tabela de pontos por colocação, editável pelo organizador.
 *
 * Cada linha vale até a próxima: uma linha no 9º cobre do 9º até a colocação da linha seguinte.
 * É assim que os regulamentos publicam ("9º ao 16º"), e é o que permite chaveamento eliminatório,
 * onde quem cai na mesma fase divide a colocação.
 */
export function PointsRulesScreen({ navigation, route }: any) {
  const { isDark, colors, brand } = useTheme();
  const tournamentId: string = route?.params?.id;

  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accent = isDark ? brand.accentLime : brand.primary;
  const placeholderColor = colors.text.disabled;

  useEffect(() => {
    standingsService
      .getPointsRules(tournamentId)
      .then(setRules)
      .catch((err) => setError(getErrorMessage(err, "Não foi possível carregar a tabela.")))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const atualizar = (i: number, campo: "placement" | "points", valor: string) => {
    const numero = valor.replace(/\D/g, "");
    setRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [campo]: numero === "" ? 0 : Number(numero) } : r)),
    );
  };

  const remover = (i: number) => setRules((prev) => prev.filter((_, idx) => idx !== i));

  const adicionar = () => {
    const ultima = rules[rules.length - 1];
    setRules((prev) => [
      ...prev,
      { placement: (ultima?.placement ?? 0) + 1, points: Math.floor((ultima?.points ?? 10) / 2) },
    ]);
  };

  const salvar = useCallback(async () => {
    const colocacoes = rules.map((r) => r.placement);
    if (new Set(colocacoes).size !== colocacoes.length) {
      setError("Há colocações repetidas. Cada colocação pode aparecer só uma vez.");
      return;
    }
    if (colocacoes.some((p) => p < 1)) {
      setError("A colocação precisa começar em 1.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      // Ordenado: a regra vale até a próxima, então a ordem é parte do significado.
      const ordenadas = [...rules].sort((a, b) => a.placement - b.placement);
      setRules(await standingsService.updatePointsRules(tournamentId, ordenadas));
      Alert.alert("Tabela salva", "A pontuação vale para as próximas etapas calculadas.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível salvar a tabela."));
    } finally {
      setSaving(false);
    }
  }, [rules, tournamentId]);

  const inputStyle = {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.text.primary,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    textAlign: "center" as const,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={["top"]}>
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <BackButton title="Tabela de pontos" onPress={() => navigation?.goBack()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
        >
          {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

          <Text style={{ color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19, marginBottom: 18 }}>
            Quantos pontos cada colocação vale. Cada linha vale até a próxima — uma linha no 9º
            cobre do 9º até a colocação seguinte da tabela.
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            <Text style={{ flex: 1, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1 }}>
              COLOCAÇÃO
            </Text>
            <Text style={{ flex: 1, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1 }}>
              PONTOS
            </Text>
            <View style={{ width: 70 }} />
          </View>

          {rules.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <TextInput
                value={String(r.placement)}
                onChangeText={(v) => atualizar(i, "placement", v)}
                keyboardType="numeric"
                maxLength={3}
                accessibilityLabel={`Colocação da linha ${i + 1}`}
                placeholderTextColor={placeholderColor}
                style={{ ...inputStyle, flex: 1 }}
              />
              <TextInput
                value={String(r.points)}
                onChangeText={(v) => atualizar(i, "points", v)}
                keyboardType="numeric"
                maxLength={5}
                accessibilityLabel={`Pontos da linha ${i + 1}`}
                placeholderTextColor={placeholderColor}
                style={{ ...inputStyle, flex: 1 }}
              />
              <Pressable
                onPress={() => remover(i)}
                accessibilityRole="button"
                accessibilityLabel={`Remover linha ${i + 1}`}
                hitSlop={8}
                style={{ width: 70, alignItems: "center" }}
              >
                <Text style={{ color: "#FF4D5E", fontFamily: "Manrope_700Bold", fontSize: 11 }}>Remover</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={adicionar}
            accessibilityRole="button"
            accessibilityLabel="Adicionar colocação"
            style={{
              borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border.input,
              borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 6,
            }}
          >
            <Text style={{ color: accent, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              + Adicionar colocação
            </Text>
          </Pressable>

          <Pressable
            onPress={salvar}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Salvar tabela de pontos"
            style={{
              backgroundColor: brand.primary, borderRadius: 16, paddingVertical: 16,
              alignItems: "center", marginTop: 22, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Salvar tabela
              </Text>
            )}
          </Pressable>

          <Text style={{ color: colors.text.disabled, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 16, marginTop: 14 }}>
            Colocação sem nenhuma linha abaixo dela vale zero. Etapas já calculadas não mudam
            sozinhas — recalcule a etapa para aplicar a tabela nova.
          </Text>
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
