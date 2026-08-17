/**
 * Parse a date string defensively. Accepts ISO 8601 with offset
 * (e.g. "2026-06-16T14:00:00-03:00"), date-only ("2026-06-16"),
 * or already-Date values. Throws on garbage input so the DTO layer can
 * convert into a 400 instead of silently storing NaN.
 *
 * Postgres stores timestamptz in UTC; JS Date → Prisma → DB always
 * serialises to UTC. As long as clients send ISO with offset, round-trip
 * is timezone-correct.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Data inválida');
    }
    return value;
  }
  // Reject non-string.
  if (typeof value !== 'string') {
    throw new Error('Data inválida');
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  // If the string is date-only (YYYY-MM-DD), append T00:00:00 to local time
  // so we don't drift a day when the client's tz is negative. We intentionally
  // do NOT apply zulu here — the client should send a full offset if it cares.
  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00`
    : trimmed;

  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Data inválida');
  }
  return d;
}

/**
 * Returns the UTC ISO string for a date input, or null if absent.
 * Useful for log fields and audit payloads.
 */
export function toUtcIso(value: string | Date | null | undefined): string | null {
  const d = parseDate(value);
  return d ? d.toISOString() : null;
}
