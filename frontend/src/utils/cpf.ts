/** Aplica a mascara 000.000.000-00 conforme o usuario digita, ignorando o que nao for digito. */
export function formatCPF(value: string): string {
  const digits = unformatCPF(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Devolve so os digitos — a API sempre recebe o CPF sem mascara. */
export function unformatCPF(value: string): string {
  return value.replace(/\D/g, "");
}
