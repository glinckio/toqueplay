/**
 * PII masking helpers for admin exports (LGPD art. 16 — minimize exposure).
 * Used in CSV/JSON exports so operators can analyze data without seeing full PII.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!user || !domain) return '—';
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '—';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '—';
  const last4 = digits.slice(-4);
  return `(***) ***-${last4}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '—';
  const first = parts[0];
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
  return `${first}${lastInitial}`;
}

/**
 * Convert an array of records into a CSV string with the given columns.
 * Values are quoted and escaped per RFC 4180.
 */
export function toCsv(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
): string {
  const escape = (v: unknown): string => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}
