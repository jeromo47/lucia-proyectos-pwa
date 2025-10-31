import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import { getProjects, type Project } from '@/lib/repo'

/** ==== Utilidades de fechas (YYYY-MM-DD) ==== */
const WEEK_START_MONDAY = true

function todayISO() {
  const d = new Date()
  const z = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  return z.toISOString().slice(0, 10)
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function toISO(d: Date): string {
  const z = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  return z.toISOString().slice(0, 10)
}
function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}
function startOfMonthISO(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)))
}
function endOfMonthISO(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}
function dayOfWeekISO(iso: string): number {
  return parseISO(iso).getUTCDay()
}
function startOfCalendarISO(monthStartISO: string): string {
  const dow = dayOfWeekISO(monthStartISO)
  if (WEEK_START_MONDAY) {
    const shift = dow === 0 ? 6 : dow - 1
    return addDaysISO(monthStartISO, -shift)
  }
  return addDaysISO(monthStartISO, -dow)
}
function endOfCalendarISO(monthEndISO: string): string {
  const dow = dayOfWeekISO(monthEndISO)
  if (WEEK_START_MONDAY) {
    const shift = dow === 0 ? 0 : 7 - dow
    return addDaysISO(monthEndISO, shift)
  }
  const shift = 6 - dow
  return addDaysISO(monthEndISO, shift)
}
function eachDayISO(startISO: string, endISO: string): string[] {
  const days: string[] = []
  let cur = startISO
  while (cur <= endISO) {
    days.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return days
}

/** ==== Paleta pastel determinista por proyecto ==== */
const PASTEL = [
  { bg: 'hsl(10 90% 94%)',  text: 'hsl(10 45% 30%)',  border: 'hsl(10 55% 70%)'  }, // coral suave
  { bg: 'hsl(25 90% 94%)',  text: 'hsl(25 45% 30%)',  border: 'hsl(25 55% 70%)'  }, // melocotón
  { bg: 'hsl(45 90% 92%)',  text: 'hsl(45 45% 28%)',  border: 'hsl(45 55% 68%)'  }, // mostaza
  { bg: 'hsl(80 70% 92%)',  text: 'hsl(80 40% 25%)',  border: 'hsl(80 45% 62%)'  }, // lima
  { bg: 'hsl(140 60% 92%)', text: 'hsl(140 35% 24%)', border: 'hsl(140 45% 62%)' }, // menta
  { bg: 'hsl(170 60% 92%)', text: 'hsl(170 35% 24%)', border: 'hsl(170 45% 62%)' }, // aguamarina
  { bg: 'hsl(195 70% 92%)', text: 'hsl(195 40% 25%)', border: 'hsl(195 50% 62%)' }, // cielo
  { bg: 'hsl(220 70% 92%)', text: 'hsl(220 40% 25%)', border: 'hsl(220 50% 62%)' }, // azul pastel
  { bg: 'hsl(250 70% 93%)', text: 'hsl(250 40% 28%)', border: 'hsl(250 50% 65%)' }, // violeta
  { bg: 'hsl(280 70% 94%)', text: 'hsl(280 40% 30%)', border: 'hsl(280 50% 68%)' }, // lila
  { bg: 'hsl(320 70% 94%)', text: 'hsl(320 40% 30%)', border: 'hsl(320 50% 70%)' }, // magenta
  { bg: 'hsl(0 0% 94%)',    text: 'hsl(0 0% 30%)',    border: 'hsl(0 0% 70%)'    }, // gris cálido
]
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return Math.abs(h)
}
function colorForProject(p: Project) {
  if (!p.confirmed) {
    return {
      style: {
        backgroundColor: 'hsl(0 85% 95%)',
        color: 'hsl(0 60% 32%)',
        borderColor: 'hsl(0 70% 70%)'
      },
      dashed: true
    }
  }
  const key = p.color_seed || p.id || p.name || 'x'
  const idx = hashString(key) % PASTEL.length
  const sw = PASTEL[idx]
  return {
    style: {
      backgroundColor: sw.bg,
      color: sw.text,
      borderColor: sw.border
    },
    dashed: false
  }
}

/** ==== Fases por día ==== */
type PhaseKey = 'P' | 'F' | 'R' | null
function phaseForDay(p: Project, isoDay: string): PhaseKey {
  if (p.prepStart && p.prepEnd && p.prepStart <= isoDay && isoDay <= p.prepEnd) return 'P'
  if (p.fittingStart && p.fittingEnd && p.fittingStart <= isoDay && isoDay <= p.fittingEnd) return 'F'
  if (p.rodajeStart && p.rodajeEnd && p.rodajeStart <= isoDay && isoDay <= p.rodajeEnd) return 'R'
  return null
}
function dayInTotalRange(p: Project, isoDay: string): boolean {
  const start = p.prepStart ?? p.rodajeStart
  const end = p.rodajeEnd
  return !!(start && end && start <= isoDay && isoDay <= end)
}

/** ==== Calendario ==== */
export default function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const t = todayISO()
    return startOfMonthISO(parseISO(t))
  })
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      const data = await getProjects()
      setItems(data)
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando calendario')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const monthStart = monthAnchor
  const monthEnd = endOfMonthISO(parseISO(monthStart))
  const calStart = startOfCalendarISO(monthStart)
  const calEnd = endOfCalendarISO(monthEnd)
  const days = useMemo(() => eachDayISO(calStart, calEnd), [calStart, calEnd])

  function gotoMonth(delta: number) {
    const d = parseISO(monthStart)
    d.setUTCMonth(d.getUTCMonth() + delta, 1)
    setMonthAnchor(startOfMonthISO(d))
  }

  const confirmedSorted = useMemo(
    () => items.filter(p => p.confirmed).sort((a, b) => (a.rodajeStart < b.rodajeStart ? -1 : 1)),
    [items]
  )
  const pending = useMemo(() => items.filter(p => !p.confirmed), [items])

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />

      <div className="p-4 md:p-6 space-y-4">
        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => gotoMonth(-1)} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">← Anterior</button>
            <button onClick={() => setMonthAnchor(startOfMonthISO(parseISO(todayISO())))} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">Hoy</button>
            <button onClick={() => gotoMonth(1)} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">Siguiente →</button>
          </div>

          <div className="font-medium">
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseISO(monthStart))}
          </div>

          <div className="text-xs text-gray-500">
            Cada día se adapta (1–4). Pendientes en rojo y discontinuo.
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="rounded-2xl border shadow-sm overflow-hidden">
            {/* Cabecera días */}
            <div className="grid grid-cols-7 bg-gray-50 text-xs text-gray-600">
              {(WEEK_START_MONDAY ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S']).map((d) => (
                <div key={d} className="px-3 py-2 border-b font-medium">{d}</div>
              ))}
            </div>

            {/* Celdas */}
            <div className="grid grid-cols-7 gap-1 p-1 bg-gray-100">
              {days.map((iso) => {
                const inMonth = iso >= monthStart && iso <= monthEnd
                const dayNum = parseISO(iso).getUTCDate()

                // Reunimos proyectos por día en su rango total
                const projectsTodayAll = items.filter(p => dayInTotalRange(p, iso))
                // Regla: prioriza confirmados; añade pendientes si caben (hasta 4)
                const confirmed = projectsTodayAll.filter(p => p.confirmed)
                const pendings = projectsTodayAll.filter(p => !p.confirmed)
                const sortedForDay = [
                  ...confirmed.slice(0, 4),
                  ...pendings.slice(0, Math.max(0, 4 - confirmed.length))
                ].slice(0, 4)

                const count = sortedForDay.length

                // Layout adaptativo:
                // 1 → 1 bloque grande
                // 2 → dos columnas
                // 3 → dos columnas con wrap (quedará 2 arriba + 1 abajo)
                // 4 → 2x2
                const containerClass =
                  count <= 1
                    ? 'h-full flex'
                    : 'h-full flex flex-wrap gap-2 mt-2'
                const itemClass = (i: number) => {
                  if (count === 1) return 'flex-1 min-h-[88px]'
                  if (count === 2) return 'basis-1/2 min-h-[72px]'
                  if (count === 3) return 'basis-1/2 min-h-[62px]'
                  return 'basis-1/2 min-h-[62px]' // 4
                }

                return (
                  <div key={iso} className="min-h-[120px]">
                    {/* Card del día */}
                    <div className={`h-full rounded-xl border ${inMonth ? 'bg-white' : 'bg-white/70'} shadow-sm p-2 relative`}>
                      {/* chip de fecha */}
                      <div className="absolute -top-2 -left-2">
                        <div className={`px-2 py-0.5 rounded-full text-[11px] border shadow-sm ${inMonth ? 'bg-white' : 'bg-gray-50'} text-gray-600`}>
                          {dayNum}
                        </div>
                      </div>

                      {/* Contenedor dinámico */}
                      <div className={containerClass}>
                        {count === 0 && (
                          <div className="w-full h-full rounded-lg border border-dashed bg-white/60" />
                        )}

                        {sortedForDay.map((p, idx) => {
                          const phase = phaseForDay(p, iso)
                          const { style, dashed } = colorForProject(p)
                          return (
                            <div
                              key={p.id + iso + idx}
                              className={[
                                'rounded-lg border p-1.5 flex flex-col justify-between overflow-hidden',
                                dashed ? 'border-dashed' : ''
                              ].join(' ')}
                              style={style as any}
                              title={p.name}
                              // tamaño según count
                            >
                              <div className={`text-[10px] leading-tight font-medium truncate`}>
                                {p.name || 'Sin título'}
                              </div>
                              <div className="flex items-center justify-end">
                                <span
                                  className={[
                                    'inline-flex items-center justify-center text-[10px] w-5 h-5 rounded-full border bg-white/60 backdrop-blur',
                                    dashed ? 'border-red-400 text-red-700' : 'border-black/20 text-black/70'
                                  ].join(' ')}
                                >
                                  {phase ?? ''}
                                </span>
                              </div>
                            </div>
                          )
                        }).map((node, i) => (
                          <div key={i} className={itemClass(i)}>
                            {node}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
