import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { DateTimeSheet } from "./DateTimeSheet";

/**
 * Abre o seletor de data/hora do app e devolve o valor já na string que o formulário usa.
 *
 * O visual fica com quem chama: o `children` recebe o texto a exibir e continua sendo a mesma
 * caixa estilizada de antes — só que com `Text` no lugar do `TextInput`. Isso mantém cada tela
 * com a aparência dela e tira o teclado numérico da jogada, que era o que mais incomodava.
 */
export type DateTimePattern = "dd/MM/yy" | "dd/MM/yyyy" | "HH:mm";

export interface DateTimeFieldProps {
  /** Formato da string trocada com o formulário. Define também se abre data ou hora. */
  pattern: DateTimePattern;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Recebe o texto a exibir (ou o placeholder) e se está vazio, para o estilo do placeholder. */
  children: (display: { text: string; isEmpty: boolean }) => React.ReactNode;
  placeholder: string;
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function formatByPattern(date: Date, pattern: DateTimePattern): string {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  switch (pattern) {
    case "dd/MM/yy":
      return `${dd}/${mm}/${pad(date.getFullYear() % 100)}`;
    case "dd/MM/yyyy":
      return `${dd}/${mm}/${date.getFullYear()}`;
    case "HH:mm":
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

/**
 * Converte o que já estava digitado de volta para Date, para o picker abrir no valor atual.
 * Devolve null quando o texto não forma uma data real (ex.: 31/02) — aí o picker abre em hoje.
 */
export function parseByPattern(value: string, pattern: DateTimePattern): Date | null {
  if (!value) return null;

  if (pattern === "HH:mm") {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const [h, min] = [Number(m[1]), Number(m[2])];
    if (h > 23 || min > 59) return null;
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  // Ano de 2 dígitos vira 20xx: o app não lida com datas do século passado.
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, month - 1, day);
  // getMonth de volta detecta overflow do JS (31/02 viraria 03/03).
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function DateTimeField({
  pattern,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
  accessibilityLabel,
  children,
  placeholder,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const mode = pattern === "HH:mm" ? "time" : "date";

  const handleConfirm = useCallback(
    (selected: Date) => {
      setOpen(false);
      onChange(formatByPattern(selected, pattern));
    },
    [onChange, pattern],
  );

  const isEmpty = !value;

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value || placeholder }}
      >
        {children({ text: value || placeholder, isEmpty })}
      </Pressable>

      <DateTimeSheet
        visible={open}
        mode={mode}
        initial={parseByPattern(value, pattern) ?? new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
