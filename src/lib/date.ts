// src/lib/date.ts
// Utilidades de fecha 100% en UTC con formato ISO (YYYY-MM-DD)

export function parseISO(iso: string): Date {
  // Espera 'YYYY-MM-DD'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new Error(`Fecha ISO inválida: ${iso}`)
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3])
  // Siempre a medianoche UTC
  return new Date(Date.UTC(y, mo, d))
}

export function toISO(d: Date): string {
  // Normaliza a medianoche UTC y serializa YYYY-MM-DD
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  return nd.toISOString().slice(0, 10)
}

export function todayISO(): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return toISO(d)
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}

export function diffDaysISO(fromIso: string, toIso: string): number {
  const a = parseISO(fromIso)
  const b = parseISO(toIso)
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / 86400000) // 24*60*60*1000
}

export function clampISO(iso: string): string {
  // Normaliza por si llega algo con hora/zona por error
  return toISO(parseISO(iso))
}

export function isBetweenInclusiveISO(iso: string, startIso: string, endIso: string): boolean {
  return startIso <= iso && iso <= endIso
}

/* —— Helpers para calendario mensual (si los necesitas fuera) —— */
export function startOfMonthISO(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)))
}
export function endOfMonthISO(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}
export function toDateUTC(iso: string): Date {
  return parseISO(iso)
}
