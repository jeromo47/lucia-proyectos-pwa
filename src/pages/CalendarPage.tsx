import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import { getProjects, type Project } from '@/lib/repo'

const WEEK_START_MONDAY = true

/* ==== util fechas ==== */
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
  const out: string[] = []
  let cur = startISO
  while (cur <= endISO) {
    out.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return out
}

/* ==== paleta pastel determinista ==== */
const PASTEL = [
  { bg: 'hsl(10 90% 94%)',  text: 'hsl(10 45% 30%)',  border: 'hsl(10 55% 70%)'  },
  { bg: 'hsl(25 90% 94%)',  text: 'hsl(25 45% 30%)',  border: 'hsl(25 55% 70%)'  },
  { bg: 'hsl(45 90% 92%)',  text: 'hsl(45 45% 28%)',  border: 'hsl(45 55% 68%)'  },
  { bg: 'hsl(80 70% 92%)',  text: 'hsl(80 40% 25%)',  border: 'hsl(80 45% 62%)'  },
  { bg: 'hsl(140 60% 92%)', text: 'hsl(140 35% 24%)', border: 'hsl(140 45% 62%)' },
  { bg: 'hsl(170 60% 92%)', text: 'hsl(170 35% 24%)', border: 'hsl(170 45% 62%)' },
  { bg: 'hsl(195 70% 92%)', text: 'hsl(195 40% 25%)', border: 'hsl(195 50% 62%)' },
  { bg: 'hsl(220 70% 92%)', text: 'hsl(220 40% 25%)', border: 'hsl(220 50% 62%)' },
  { bg: 'hsl(250 70% 93%)', text: 'hsl(250 40% 28%)', border: 'hsl(250 50% 65%)' },
  { bg: 'hsl(280 70% 94%)', text: 'hsl(280 40% 30%)', border: 'hsl(280 50% 68%)' },
  { bg: 'hsl(320 70% 94%)', text: 'hsl(320 40% 30%)', border: 'hsl(320 50% 70%)' },
  { bg: 'hsl(0 0% 94%)',    text: 'hsl(0 0% 30%)',    border: 'hsl(0 0% 70%)'    },
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
        backgroundColor: 'hsl(0 85% 96%)',
        color: 'hsl(0 60% 32%)',
        borderColor: 'hsl(0 70% 72%)'
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

/* ==== rangos & fases ==== */
type PhaseKey = 'P' | 'F' | 'R' | null
function phaseForDay(p: Project, iso: string): PhaseKey {
  if (p.prepStart && p.prepEnd && p.prepStart <= iso && iso <= p.prepEnd) return 'P'
  if (p.fittingStart && p.fittingEnd && p.fittingStart <= iso && iso <= p.fittingEnd) return 'F'
  if (p.rodajeStart && p.rodajeEnd && p.rodajeStart <= iso && iso <= p.rodajeEnd) return 'R'
  return null
}
function projectTotalRange(p: Project): { start: string | null, end: string | null } {
  const start = p.prepStart ?? p.rodajeStart ?? null
  const end = p.rodajeEnd ?? null
  return { start, end }
}
function overlapsCalendar(p: Project, calStart: string, calEnd: string): boolean {
  const { start, end } = projectTotalRange(p)
  if (!start || !end) return false
  return !(end < calStart || start > calEnd)
}
function dayInTotalRange(p: Project, iso: string): boolean {
  const { start, end } = projectTotalRange(p)
  return !!(start && end && start <= iso && iso <= end)
}

/* ==== componente principal ==== */
function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthISO(parseISO(todayISO())))
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

  const legendProjects = useMemo(() => {
    const present = items.filter(p => overlapsCalendar(p, calStart, calEnd))
    return present.sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [items, calStart, calEnd])

  function gotoMonth(delta: number) {
    const d = parseISO(monthStart)
    d.setUTCMonth(d.getUTCMonth() + delta, 1)
    setMonthAnchor(startOfMonthISO(d))
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-3 md:p-6 space-y-3 md:space-y-4">
        {/* Cabecera centrada: ←  Mes  → */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button onClick={() => gotoMonth(-1)} aria-label="Mes anterior" className="px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border text-sm hover:bg-gray-50">←</button>
          <div className="text-base md:text-lg font-medium">
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseISO(monthStart))}
          </div>
          <button onClick={() => gotoMonth(1)} aria-label="Mes siguiente" className="px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border text-sm hover:bg-gray-50">→</button>
        </div>

        {loading && <div className="text-sm text-gray-500 text-center">Cargando…</div>}
        {error && <div className="text-sm text-red-600 text-center">{error}</div>}

        {!loading && !error && (
          <>
            <div className="rounded-2xl border shadow-sm overflow-hidden">
              {/* Cabecera días */}
              <div className="grid grid-cols-7 bg-gray-50 text-[11px] md:text-xs text-gray-600">
                {(WEEK_START_MONDAY ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S']).map((d) => (
                  <div key={d} className="px-2 md:px-3 py-2 border-b font-medium">{d}</div>
                ))}
              </div>

              {/* Grid calendario */}
              <CalendarGrid items={items} monthStart={monthStart} monthEnd={monthEnd} calStart={calStart} calEnd={calEnd} />
            </div>

            {legendProjects.length > 0 && <Legend projects={legendProjects} />}
          </>
        )}
      </div>
    </div>
  )
}

/* ==== Subcomponentes (Grid, Card, Legend) ==== */
// (mismo contenido que ya tienes)
function CalendarGrid({ items, monthStart, monthEnd, calStart, calEnd }: any) {
  // … tu grid actual
  return <div> {/* contenido existente */} </div>
}

function Legend({ projects }: { projects: Project[] }) {
  const nav = useNavigate()
  return (
    <div className="mt-3 md:mt-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 md:mb-2">Proyectos del mes</div>
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {projects.map((p) => {
          const { style, dashed } = colorForProject(p)
          return (
            <button key={p.id} onClick={() => nav(`/project/${p.id}`)} title={p.name}
              className={[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] md:text-xs transition',
                'hover:brightness-95 active:brightness-90',
                dashed ? 'border-dashed' : ''
              ].join(' ')} style={style as any}>
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 bg-white/50" />
              <span className="truncate max-w-[140px] md:max-w-[200px]">{p.name || 'Sin título'}</span>
              {!p.confirmed && <span className="ml-1 text-[10px] text-red-700">Pendiente</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ✅ exportación por defecto para Netlify/Vite */
export default CalendarPage
