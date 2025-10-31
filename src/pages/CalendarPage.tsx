import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '@/components/HeaderBar'
import { getProjects, type Project } from '@/lib/repo'

/** ==== Utilidades de fechas (YYYY-MM-DD) ==== */
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/
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
  // día 0 del mes siguiente => último del mes actual
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}
function dayOfWeekISO(iso: string): number {
  // 0..6, domingo=0 … sábado=6
  return parseISO(iso).getUTCDay()
}
function startOfCalendarISO(monthStartISO: string): string {
  const dow = dayOfWeekISO(monthStartISO) // 0:dom, 1:lun...
  if (WEEK_START_MONDAY) {
    // queremos lunes=0; si es domingo (0) => retroceder 6; si es lunes(1)=>0...
    const shift = dow === 0 ? 6 : dow - 1
    return addDaysISO(monthStartISO, -shift)
  }
  // semana empieza domingo
  return addDaysISO(monthStartISO, -dow)
}
function endOfCalendarISO(monthEndISO: string): string {
  const dow = dayOfWeekISO(monthEndISO)
  if (WEEK_START_MONDAY) {
    // queremos domingo como final visible; si fin es domingo (0) => +0; si es lunes (1) => +6...
    const shift = dow === 0 ? 0 : 7 - dow
    return addDaysISO(monthEndISO, shift)
  }
  // semana empieza domingo; queremos sábado (6)
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

/** ==== Colores de proyectos ==== */
function hashToHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360
  }
  return h
}
function colorForProject(p: Project): { bg: string; text: string; border: string } {
  if (!p.confirmed) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-400 border-dashed'
    }
  }
  const base = p.color_seed ?? p.id ?? p.name ?? 'x'
  const hue = hashToHue(base)
  // paleta suave
  const bg = `bg-[hsl(${hue}deg_85%_90%)]`
  const text = `text-[hsl(${hue}deg_40%_28%)]`
  const border = `border-[hsl(${hue}deg_60%_60%)]`
  return { bg, text, border }
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

/** ==== Componente principal ==== */
export default function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const t = todayISO()
    // Anclamos al primer día del mes actual
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

  // Proyectos a renderizar: hasta 4 confirmados "más cercanos" y todos los pendientes (en rojo) visibles
  const confirmedSorted = useMemo(() => {
    return items
      .filter(p => p.confirmed)
      .sort((a, b) => (a.rodajeStart < b.rodajeStart ? -1 : 1))
  }, [items])

  const pending = useMemo(() => items.filter(p => !p.confirmed), [items])

  // Coge hasta 4 confirmados representativos + todos los pendientes (se verán translúcidos/rojos)
  const paletteProjects = useMemo(() => {
    return confirmedSorted.slice(0, 4).concat(pending)
  }, [confirmedSorted, pending])

  // Render
  return (
    <div className="h-full flex flex-col">
      <HeaderBar />

      <div className="p-4 md:p-6 space-y-4">
        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => gotoMonth(-1)}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setMonthAnchor(startOfMonthISO(parseISO(todayISO())))}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Hoy
            </button>
            <button
              onClick={() => gotoMonth(1)}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>

          <div className="font-medium">
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
              .format(parseISO(monthStart))}
          </div>

          <div className="text-xs text-gray-500">
            Máx. 4 proyectos simultáneos (los más próximos). Pendientes en rojo y discontinuo.
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="border rounded-xl overflow-hidden">
            {/* Cabecera días de la semana */}
            <div className="grid grid-cols-7 bg-gray-50 text-xs text-gray-600">
              {(WEEK_START_MONDAY
                ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
                : ['D', 'L', 'M', 'X', 'J', 'V', 'S']
              ).map((d) => (
                <div key={d} className="px-2 py-2 border-b">{d}</div>
              ))}
            </div>

            {/* Celdas de días */}
            <div className="grid grid-cols-7">
              {days.map((iso) => {
                const inMonth = iso >= monthStart && iso <= monthEnd
                const dayNum = parseISO(iso).getUTCDate()

                // Reunir proyectos que caen en este día (en su rango total)
                const projectsToday = paletteProjects.filter(p => dayInTotalRange(p, iso))
                // Mostrar como máximo 4 mini-celdas (2×2). Prioriza confirmados.
                const sortedForDay = [
                  ...projectsToday.filter(p => p.confirmed).slice(0, 4),
                  ...projectsToday.filter(p => !p.confirmed).slice(0, Math.max(0, 4 - projectsToday.filter(p => p.confirmed).length)),
                ].slice(0, 4)

                return (
                  <div
                    key={iso}
                    className={`min-h-[94px] border p-1 relative ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {/* número del día */}
                    <div className="absolute top-1 right-1 text-[11px] text-gray-500">{dayNum}</div>

                    {/* cuadrícula 2x2 de mini-proyectos */}
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                      {sortedForDay.map((p, idx) => {
                        const phase = phaseForDay(p, iso) // 'P' | 'F' | 'R' | null
                        const col = colorForProject(p)

                        // estilos de pendiente
                        const pendingStyles = p.confirmed
                          ? ''
                          : 'opacity-70'

                        return (
                          <div
                            key={p.id + iso + idx}
                            className={[
                              'rounded-md border p-1 flex flex-col justify-between overflow-hidden',
                              col.bg, col.border, pendingStyles,
                            ].join(' ')}
                            title={p.name}
                          >
                            <div className={`text-[10px] leading-tight font-medium truncate ${col.text}`}>
                              {p.name || 'Sin título'}
                            </div>
                            <div className="flex items-center justify-end">
                              <span className={[
                                'inline-flex items-center justify-center text-[10px] w-4 h-4 rounded-full border',
                                p.confirmed ? 'border-black/20 text-black/70' : 'border-red-500 text-red-700'
                              ].join(' ')}>
                                {phase ?? ''}
                              </span>
                            </div>
                          </div>
                        )
                      })}

                      {/* Relleno si hay <4 proyectos */}
                      {Array.from({ length: Math.max(0, 4 - sortedForDay.length) }).map((_, i) => (
                        <div key={`empty-${iso}-${i}`} className="rounded-md border border-dashed" />
                      ))}
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
