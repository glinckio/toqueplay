/**
 * ToquePlay is Brazil-only, so all displayed times are fixed to
 * America/Sao_Paulo instead of relying on `toLocaleTimeString`/
 * `toLocaleDateString`'s default (the device's system timezone). Android
 * emulators commonly report UTC as their system timezone regardless of the
 * host machine's real clock, which made every displayed time run 3h ahead.
 */
const TIME_ZONE = "America/Sao_Paulo";

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { ...opts, timeZone: TIME_ZONE });
}
