import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/ui/BackButton";
import { Banner } from "@/components/ui/Banner";
import {
  standingsService,
  TournamentStandings,
  GroupStandingRow,
} from "@/services/standingsService";
import { tournamentsService } from "@/services/tournamentsService";
import { getErrorMessage } from "@/services/api";

type Aba = "geral" | "etapa";

interface GrupoDaEtapa {
  bracketId: string;
  group: number;
  rows: GroupStandingRow[];
}

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
  const [grupos, setGrupos] = useState<GrupoDaEtapa[]>([]);
  const [aba, setAba] = useState<Aba>("geral");
  const [eventType, setEventType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const accent = isDark ? brand.accentLime : brand.primary;

  const carregar = useCallback(async () => {
    setError("");
    try {
      const [acumulada, brackets, torneio] = await Promise.all([
        standingsService.getStandings(tournamentId),
        // Best-effort: torneio sem chave gerada ainda nao tem tabela de grupo.
        tournamentsService.getBracket(tournamentId).catch(() => [] as any[]),
        tournamentsService.findOne(tournamentId).catch(() => null),
      ]);
      setData(acumulada);

      // Os rotulos mudam com o formato: "Geral / Etapa atual" so faz sentido quando existem
      // varias etapas para comparar. Num dia unico e numa liga e "Resultado / Classificacao".
      const tipo = torneio?.eventType ?? null;
      setEventType(tipo);
      if (tipo && tipo !== "CIRCUIT") setAba("etapa");

      const tabelas = await Promise.all(
        (brackets ?? []).map(async (b: any) => {
          const porGrupo = await standingsService
            .getGroupStandings(tournamentId, b.id)
            .catch(() => []);
          return porGrupo.map((g) => ({ bracketId: b.id, group: g.group, rows: g.rows }));
        }),
      );
      setGrupos(tabelas.flat());
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

          {/* Duas tabelas de naturezas diferentes: a geral soma pontos por colocacao entre etapas;
              a da etapa vem do placar das partidas (3/2/1/0) e e quem decide o avanco. */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {(eventType === "CIRCUIT"
              ? ([["geral", "Geral"], ["etapa", "Etapa atual"]] as const)
              : ([["etapa", "Classificação"], ["geral", "Resultado"]] as const)
            ).map(([key, label]) => {
              const ativa = aba === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setAba(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center",
                    backgroundColor: ativa ? accent : "transparent",
                    borderWidth: ativa ? 0 : 1, borderColor: colors.border.card,
                  }}
                >
                  <Text style={{
                    color: ativa ? (isDark ? brand.limeText : "#FFFFFF") : colors.text.secondary,
                    fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {aba === "etapa" && (
            <GroupTables
              grupos={grupos}
              colors={colors}
              accent={accent}
            />
          )}

          {aba === "geral" && !error && data?.categories.length === 0 && (
            <Text style={{ color: colors.text.tertiary, fontFamily: "Manrope_500Medium", fontSize: 13 }}>
              Este torneio ainda não tem categorias.
            </Text>
          )}

          {aba === "geral" && data?.categories.map(({ category, rows }) => (
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
                  {eventType === "CIRCUIT"
                    ? "Nenhuma etapa encerrada ainda."
                    : "A colocação aparece conforme as partidas vão sendo encerradas."}
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

          {aba === "geral" && (
            <Text style={{ color: colors.text.disabled, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 16 }}>
              {eventType === "CIRCUIT"
                ? "O traço marca etapa não disputada. A tabela é atualizada a cada partida encerrada — quem já foi eliminado numa etapa entra na conta na hora."
                : "Atualizada a cada partida encerrada: quem já foi eliminado entra na conta na hora, quem ainda joga fica sem colocação."}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/**
 * Classificação de grupo, no padrão CBV: os pontos vêm do placar (3 para vitória, 2/1 quando vai
 * ao set decisivo) e o desempate é por sets average, depois pontos average.
 */
function GroupTables({ grupos, colors, accent }: any) {
  if (grupos.length === 0) {
    return (
      <Text style={{ color: colors.text.tertiary, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20 }}>
        Nenhuma tabela de grupo ainda. Ela aparece quando o chaveamento tiver fase de grupos ou
        todos contra todos — mata-mata puro não gera classificação.
      </Text>
    );
  }

  const col = (w: number) => ({ width: w, textAlign: "center" as const });

  return (
    <>
      {grupos.map((g: GrupoDaEtapa) => (
        <View
          key={`${g.bracketId}-${g.group}`}
          style={{
            backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.card,
            borderRadius: 18, padding: 16, marginBottom: 16,
          }}
        >
          <Text style={{ color: accent, fontFamily: "Oswald_700Bold", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 }}>
            Grupo {String.fromCharCode(65 + g.group)}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                <Text style={{ width: 26, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10 }}>#</Text>
                <Text style={{ width: 120, color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10 }}>TIME</Text>
                {["J", "V", "D", "SETS", "SA", "PTS"].map((h, i) => (
                  <Text key={h} style={{ ...col(i === 3 ? 56 : i === 4 ? 48 : 34), color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 10 }}>
                    {h}
                  </Text>
                ))}
              </View>

              {g.rows.map((r: GroupStandingRow, idx: number) => (
                <View
                  key={r.teamId}
                  style={{
                    flexDirection: "row", alignItems: "center", paddingVertical: 8,
                    borderTopWidth: 1, borderTopColor: colors.border.card,
                  }}
                >
                  <Text style={{ width: 26, color: colors.text.tertiary, fontFamily: "Manrope_600SemiBold", fontSize: 12 }}>{idx + 1}</Text>
                  <Text numberOfLines={1} style={{ width: 120, color: colors.text.primary, fontFamily: "Manrope_600SemiBold", fontSize: 12.5 }}>
                    {r.team?.name ?? r.teamId.slice(0, 8)}
                  </Text>
                  <Text style={{ ...col(34), color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{r.played}</Text>
                  <Text style={{ ...col(34), color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{r.wins}</Text>
                  <Text style={{ ...col(34), color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>{r.losses}</Text>
                  <Text style={{ ...col(56), color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
                    {r.setsWon}/{r.setsLost}
                  </Text>
                  <Text style={{ ...col(48), color: colors.text.secondary, fontFamily: "Manrope_500Medium", fontSize: 12 }}>
                    {r.setAverage.toFixed(2)}
                  </Text>
                  <Text style={{ ...col(34), color: accent, fontFamily: "Manrope_700Bold", fontSize: 13 }}>{r.leaguePoints}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}

      <Text style={{ color: colors.text.disabled, fontFamily: "Manrope_400Regular", fontSize: 11, lineHeight: 16 }}>
        Vitória por 2×0 vale 3 pontos; no set decisivo, 2 para quem vence e 1 para quem perde.
        Empate em pontos se resolve por sets average (SA), depois pontos average.
      </Text>
    </>
  );
}
