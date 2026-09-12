import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import { standingsService, TournamentStandings } from "@/services/standingsService";
import { getErrorMessage } from "@/services/api";

/**
 * Tabela acumulada do torneio, por categoria.
 *
 * Uma coluna por etapa e o total à direita. Etapa não disputada aparece como "—", não como 0:
 * são coisas diferentes — zero é quem jogou e não pontuou.
 */
export function StandingsScreen({ navigation, route }: any) {
  const { isDark, colors, brand } = useTheme();
  const tournamentId: string = route?.params?.id;

  const [data, setData] = useState<TournamentStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const accent = isDark ? brand.accentLime : brand.primary;

  const carregar = useCallback(async () => {
    setError("");
    try {
      setData(await standingsService.getStandings(tournamentId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Não foi possível carregar a classificação."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const stageLabel = (name: string | null, i: number) => name?.trim() || `E${i + 1}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={["top"]}>
      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <BackButton title="Classificação" onPress={() => navigation?.goBack()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void carregar();
              }}
              tintColor={accent}
            />
          }
        >
          {!!error && <Banner variant="error" message={error} style={{ marginBottom: 16 }} />}

          {!error && data?.categories.length === 0 && (
            <Text style={{ color: colors.text.tertiary, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
              Este torneio ainda não tem categorias.
            </Text>
          )}

          {data?.categories.map(({ category, rows }) => (
            <View
              key={category.id}
              style={{
                backgroundColor: colors.bg.card,
                borderWidth: 1,
                borderColor: colors.border.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: accent, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 }}>
                {category.format} · {category.type}
              </Text>

              {rows.length === 0 ? (
                <Text style={{ color: colors.text.tertiary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
                  Nenhuma etapa encerrada ainda.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Cabeçalho */}
                    <View style={{ flexDirection: "row", marginBottom: 8 }}>
                      <Text style={{ width: 28, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1 }}>
                        #
                      </Text>
                      <Text style={{ width: 130, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1 }}>
                        TIME
                      </Text>
                      {data.stages.map((st, i) => (
                        <Text
                          key={st.id}
                          style={{ width: 44, textAlign: "center", color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 0.5 }}
                        >
                          {stageLabel(st.name, i)}
                        </Text>
                      ))}
                      <Text style={{ width: 52, textAlign: "center", color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10, letterSpacing: 1 }}>
                        TOTAL
                      </Text>
                    </View>

                    {rows.map((row, idx) => (
                      <View
                        key={row.team.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.border.card,
                        }}
                      >
                        <Text style={{ width: 28, color: colors.text.tertiary, fontFamily: "Manrope_600SemiBold", fontSize: 12 }}>
                          {idx + 1}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ width: 130, color: colors.text.primary, fontFamily: "Manrope_600SemiBold", fontSize: 13 }}
                        >
                          {row.team.name}
                        </Text>
                        {data.stages.map((st) => {
                          const naEtapa = row.byStage[st.id];
                          return (
                            <Text
                              key={st.id}
                              style={{
                                width: 44,
                                textAlign: "center",
                                color: naEtapa ? colors.text.secondary : colors.text.disabled,
                                fontFamily: "Manrope_500Medium",
                                fontSize: 12,
                              }}
                            >
                              {naEtapa ? naEtapa.points : "—"}
                            </Text>
                          );
                        })}
                        <Text style={{ width: 52, textAlign: "center", color: accent, fontFamily: "Manrope_700Bold", fontSize: 13 }}>
                          {row.total}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ))}

          <Text style={{ color: colors.text.disabled, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 16 }}>
            O traço marca etapa não disputada. A tabela é atualizada a cada partida encerrada —
            quem já foi eliminado numa etapa entra na conta na hora.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
