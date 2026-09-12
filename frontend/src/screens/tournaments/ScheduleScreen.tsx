import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { DateTimeField, parseByPattern } from "@/components/ui/DateTimeField";
import { tournamentsService } from "@/services/tournamentsService";
import { getErrorMessage } from "@/services/api";

/**
 * Agendamento dos dias de jogo da liga.
 *
 * O organizador informa as datas; o sistema distribui as partidas na ordem do chaveamento. Ele
 * nunca escolhe os confrontos — quem define quem joga contra quem é a chave, não o calendário.
 */
export function ScheduleScreen({ navigation, route }: any) {
  const { isDark, colors, brand } = useTheme();
  const tournamentId: string = route?.params?.id;

  const [preview, setPreview] = useState<{
    totalMatches: number;
    matchesPerDay: number;
    datesNeeded: number;
  } | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accent = isDark ? brand.accentLime : brand.primary;

  useEffect(() => {
    tournamentsService
      .previewSchedule(tournamentId)
      .then((p) => {
        setPreview(p);
        setDates(Array(p.datesNeeded).fill(""));
      })
      .catch((err) =>
        setError(
          getErrorMessage(
            err,
            "Não foi possível calcular as datas. Defina quantos jogos cabem por dia no torneio.",
          ),
        ),
      )
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const atualizar = (i: number, valor: string) =>
    setDates((prev) => prev.map((d, idx) => (idx === i ? valor : d)));

  const salvar = useCallback(async () => {
    const vazias = dates.filter((d) => !d).length;
    if (vazias > 0) {
      setError(`Faltam ${vazias} data${vazias > 1 ? "s" : ""} para cobrir todas as partidas.`);
      return;
    }

    const iso = dates.map((d) => parseByPattern(d, "dd/MM/yy")?.toISOString()).filter(Boolean);
    if (iso.length !== dates.length) {
      setError("Alguma data está inválida.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const res = await tournamentsService.scheduleMatches(tournamentId, iso as string[]);
      Alert.alert(
        "Calendário definido",
        `${res.scheduled} partidas distribuídas em ${res.datesUsed} dias.`,
        [{ text: "OK", onPress: () => navigation?.goBack() }],
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível salvar o calendário."));
    } finally {
      setSaving(false);
    }
  }, [dates, tournamentId, navigation]);

  const campoStyle = {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={["top"]}>
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <BackButton title="Dias de jogo" onPress={() => navigation?.goBack()} />
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

          {preview && (
            <View
              style={{
                backgroundColor: colors.bg.card,
                borderWidth: 1,
                borderColor: colors.border.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: accent, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>
                O que o chaveamento gerou
              </Text>
              {[
                ["Partidas", String(preview.totalMatches)],
                ["Jogos por dia", String(preview.matchesPerDay)],
                ["Datas necessárias", String(preview.datesNeeded)],
              ].map(([label, valor]) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                  <Text style={{ color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
                    {label}
                  </Text>
                  <Text style={{ color: colors.text.primary, fontFamily: "Manrope_700Bold", fontSize: 13 }}>
                    {valor}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={{ color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12.5, lineHeight: 19, marginBottom: 16 }}>
            Informe as datas na ordem. As partidas são distribuídas seguindo o chaveamento — a fase
            de grupos primeiro, o mata-mata depois. Você escolhe os dias, não os confrontos.
          </Text>

          {dates.map((d, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Text style={{ width: 58, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1 }}>
                DIA {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  pattern="dd/MM/yy"
                  value={d}
                  onChange={(v) => atualizar(i, v)}
                  placeholder="dd/mm/aa"
                  accessibilityLabel={`Data do dia ${i + 1}`}
                >
                  {({ text, isEmpty }) => (
                    <Text
                      style={{
                        ...campoStyle,
                        color: isEmpty ? colors.text.disabled : colors.text.primary,
                      }}
                    >
                      {text}
                    </Text>
                  )}
                </DateTimeField>
              </View>
            </View>
          ))}

          <Pressable
            onPress={salvar}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Salvar calendário"
            style={{
              backgroundColor: brand.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 16,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontFamily: "Oswald_700Bold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Salvar calendário
              </Text>
            )}
          </Pressable>

          <Text style={{ color: colors.text.disabled, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 16, marginTop: 14 }}>
            Salvar de novo redistribui tudo a partir das datas informadas.
          </Text>
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
