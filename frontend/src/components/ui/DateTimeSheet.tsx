import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

/**
 * Seletor de data/hora próprio, com os tokens do app.
 *
 * Substitui o picker nativo do Android, que só aceitava trocar rótulo e cor de botão — fundo,
 * superfície e fontes vinham do tema do sistema, então destoava do resto do app.
 */

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ROW_H = 44;

export interface DateTimeSheetProps {
  visible: boolean;
  mode: "date" | "time";
  /** Valor inicial do rascunho. O confirm devolve a data escolhida. */
  initial: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

function Chevron({ dir, color }: { dir: "left" | "right"; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </Svg>
  );
}

export function DateTimeSheet({
  visible,
  mode,
  initial,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: DateTimeSheetProps) {
  const { isDark, colors, brand } = useTheme();

  const accent = isDark ? brand.accentLime : brand.primary;
  const onAccent = isDark ? brand.limeText : "#FFFFFF";
  const sheetBg = colors.bg.sheet;
  const cardBorder = colors.border.card;

  const [draft, setDraft] = useState(initial);
  // O mês exibido anda independente da seleção: dá para navegar sem escolher nada.
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  // Reabrir precisa voltar ao valor atual do campo, não ao que sobrou da vez passada.
  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    setCursor(new Date(initial.getFullYear(), initial.getMonth(), 1));
  }, [visible, initial]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const isDisabled = (d: Date) => {
    if (minimumDate && startOfDay(d) < startOfDay(minimumDate)) return true;
    if (maximumDate && startOfDay(d) > startOfDay(maximumDate)) return true;
    return false;
  };

  const today = new Date();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(6,4,10,0.6)" }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} accessibilityLabel="Fechar" />

        <View style={{
          backgroundColor: sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingTop: 12, paddingHorizontal: 22, paddingBottom: 30,
        }}>
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(26,16,48,0.1)" }} />
          </View>

          {mode === "date" ? (
            <>
              {/* Navegação de mês */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Pressable
                  onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Mês anterior"
                  hitSlop={10}
                  style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cardBorder }}
                >
                  <Chevron dir="left" color={colors.text.secondary} />
                </Pressable>

                <Text style={{ color: colors.text.primary, fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                </Text>

                <Pressable
                  onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Próximo mês"
                  hitSlop={10}
                  style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cardBorder }}
                >
                  <Chevron dir="right" color={colors.text.secondary} />
                </Pressable>
              </View>

              {/* Cabeçalho dos dias da semana */}
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {WEEKDAYS.map((w, i) => (
                  <Text
                    key={`${w}-${i}`}
                    style={{ flex: 1, textAlign: "center", color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1 }}
                  >
                    {w}
                  </Text>
                ))}
              </View>

              {/* Grade */}
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {grid.map((day, i) => {
                  if (!day) return <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, height: ROW_H }} />;
                  const selected = sameDay(day, draft);
                  const disabled = isDisabled(day);
                  const isToday = sameDay(day, today);
                  return (
                    <View key={day.toISOString()} style={{ width: `${100 / 7}%`, height: ROW_H, alignItems: "center", justifyContent: "center" }}>
                      <Pressable
                        onPress={() => !disabled && setDraft(new Date(day.getFullYear(), day.getMonth(), day.getDate(), draft.getHours(), draft.getMinutes()))}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${day.getDate()} de ${MONTHS[day.getMonth()]}`}
                        accessibilityState={{ selected, disabled }}
                        style={{
                          width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center",
                          backgroundColor: selected ? accent : "transparent",
                          borderWidth: !selected && isToday ? 1.5 : 0,
                          borderColor: accent,
                          opacity: disabled ? 0.25 : 1,
                        }}
                      >
                        <Text style={{
                          color: selected ? onAccent : colors.text.primary,
                          fontFamily: selected ? "Manrope_700Bold" : "Manrope_500Medium",
                          fontSize: 14,
                        }}>
                          {day.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <TimeColumns draft={draft} setDraft={setDraft} accent={accent} onAccent={onAccent} />
          )}

          {/* Ações */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: cardBorder, alignItems: "center" }}
            >
              <Text style={{ color: colors.text.secondary, fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(draft)}
              accessibilityRole="button"
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: brand.primary, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                Confirmar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimeColumns({
  draft,
  setDraft,
  accent,
  onAccent,
}: {
  draft: Date;
  setDraft: (d: Date) => void;
  accent: string;
  onAccent: string;
}) {
  const { colors } = useTheme();
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  // Abre já mostrando o valor atual, em vez de forçar rolar desde a meia-noite.
  useEffect(() => {
    const t = setTimeout(() => {
      hourRef.current?.scrollTo({ y: Math.max(0, (draft.getHours() - 2) * ROW_H), animated: false });
      minuteRef.current?.scrollTo({ y: Math.max(0, (draft.getMinutes() - 2) * ROW_H), animated: false });
    }, 0);
    return () => clearTimeout(t);
    // Só no mount da coluna: rolar a cada toque brigaria com o dedo do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const column = (
    label: string,
    values: number[],
    selected: number,
    onPick: (v: number) => void,
    ref: React.RefObject<ScrollView | null>,
  ) => (
    <View style={{ flex: 1 }}>
      <Text style={{ textAlign: "center", color: colors.text.disabled, fontFamily: "Oswald_600SemiBold", fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </Text>
      <ScrollView
        ref={ref}
        style={{ height: ROW_H * 5 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {values.map((v) => {
          const isSel = v === selected;
          return (
            <Pressable
              key={v}
              onPress={() => onPick(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              style={{
                height: ROW_H, alignItems: "center", justifyContent: "center",
                borderRadius: 12, backgroundColor: isSel ? accent : "transparent",
              }}
            >
              <Text style={{
                color: isSel ? onAccent : colors.text.primary,
                fontFamily: isSel ? "Manrope_700Bold" : "Manrope_500Medium",
                fontSize: 16,
              }}>
                {v.toString().padStart(2, "0")}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      {column("HORA", HOURS, draft.getHours(), (h) => {
        const d = new Date(draft);
        d.setHours(h);
        setDraft(d);
      }, hourRef)}
      {column("MINUTO", MINUTES, draft.getMinutes(), (m) => {
        const d = new Date(draft);
        d.setMinutes(m);
        setDraft(d);
      }, minuteRef)}
    </View>
  );
}
