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

/* ==== helper iniciales ==== */
function initials(name?: string, maxLetters = 3): string {
  const n = (name || '').trim()
  if (!n) return ''
  const parts = n.split(/\s+/).slice(0, 3)
  let chars = parts.map(w => w[0] ?? '').join('')
  if (parts.length === 1 && n.length >= 2) chars = n.slice(0, 2)
  return chars.toUpperCase().slice(0, maxLetters)
}

/* ==== paleta pastel determinista ==== */
const PASTEL = [
  { bg: 'hsl(10 90% 94%)', text: 'hsl(10 45% 30%)', border: 'hsl(10 55% 70%)' },
  { bg: 'hsl(25 90% 94%)', text: 'hsl(25 45% 30%)', border: 'hsl(25 55% 70%)' },
  { bg: 'hsl(45 90% 92%)', text: 'hsl(45 45% 28%)', border: 'hsl(45 55% 68%)' },
  { bg: 'hsl(80 70% 92%)', text: 'hsl(80 40% 25%)', border: 'hsl(80 45% 62%)' },
  { bg: 'hsl(140 60% 92%)', text: 'hsl(140 35% 24%)', border: 'hsl(140 45% 62%)' },
  { bg: 'hsl(170 60% 92%)', text: 'hsl(170 35% 24%)', border: 'hsl(170 45% 62%)' },
  { bg: 'hsl(195 70% 92%)', text: 'hsl(195 40% 25%)', border: 'hsl(195 50% 62%)' },
  { bg: 'hsl(220 70% 92%)', text: 'hsl(220 40% 25%)', border: 'hsl(220 50% 62%)' },
  { bg: 'hsl(250 70% 93%)', text: 'hsl(250 40% 28%)', border: 'hsl(250 50% 65%)' },
  { bg: 'hsl(280 70% 94%)', text: 'hsl(280 40% 30%)', border: 'hsl(280 50% 68%)' },
  { bg: 'hsl(320 70% 94%)', text: 'hsl(320 40% 30%)', border: 'hsl(320 50% 70%)' },
  { bg: 'hsl(0 0% 94%)', text: 'hsl(0 0% 30%)', border: 'hsl(0 0% 70%)' }
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
    style: { backgroundColor: sw.bg, color: sw.text, borderColor: sw.border },
    dashed: false
  }
}

/* ==== fases ==== */
type PhaseKey = 'P' | 'F' | 'R' | null
function phaseForDay(p: Project, iso: string): PhaseKey {
  if (p.prepStart && p.prepEnd && p.prepStart <= iso && iso <= p.prepEnd) return 'P'
  if (p.fittingStart && p.fittingEnd && p.fittingStart <= iso && iso <= p.fittingEnd) return 'F'
  if (p.rodajeStart && p.rodajeEnd && p.rodajeStart <= iso && iso <= p.rodajeEnd) return 'R'
  return null
}
function projectTotalRange(p: Project) {
  const start = p.prepStart ?? p.rodajeStart ?? null
  const end = p.rodajeEnd ?? null
  return { start, end }
}
function overlapsCalendar(p: Project, calStart: string, calEnd: string) {
  const { start, end } = projectTotalRange(p)
  if (!start || !end) return false
  return !(end < calStart || start > calEnd)
}
function dayInTotalRange(p: Project, iso: string) {
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
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button onClick={() => gotoMonth(-1)} className="px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border">←</button>
          <div className="text-base md:text-lg font-medium">
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseISO(monthStart))}
          </div>
          <button onClick={() => gotoMonth(1)} className="px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border">→</button>
        </div>

        {loading && <div className="text-sm text-gray-500 text-center">Cargando…</div>}
        {error && <div className="text-sm text-red-600 text-center">{error}</div>}

        {!loading && !error && (
          <>
            <div className="rounded-2xl border shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50 text-[11px] md:text-xs text-gray-600">
                {(WEEK_START_MONDAY ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S']).map((d) => (
                  <div key={d} className="px-2 md:px-3 py-2 border-b font-medium">{d}</div>
                ))}
              </div>
              <CalendarGrid items={items} monthStart={monthStart} monthEnd={monthEnd} calStart={calStart} calEnd={calEnd} />
            </div>
            {legendProjects.length > 0 && <Legend projects={legendProjects} />}
          </>
        )}
      </div>
    </div>
  )
}

/* ==== Grid calendario ==== */
function CalendarGrid({ items, monthStart, monthEnd, calStart, calEnd }: { items: Project[], monthStart: string, monthEnd: string, calStart: string, calEnd: string }) {
  const days = useMemo(() => eachDayISO(calStart, calEnd), [calStart, calEnd])
  return (
    <div className="grid grid-cols-7 gap-[3px] md:gap-1 p-[3px] md:p-1 bg-gray-100">
      {days.map((iso) => {
        const inMonth = iso >= monthStart && iso <= monthEnd
        const dayNum = parseISO(iso).getUTCDate()
        const pAll = items.filter(p => dayInTotalRange(p, iso))
        const pConf = pAll.filter(p => p.confirmed)
        const pPend = pAll.filter(p => !p.confirmed)
        const pDay = [...pConf.slice(0, 4), ...pPend.slice(0, Math.max(0, 4 - pConf.length))].slice(0, 4)
        const count = pDay.length
        const dayMinH =
          count === 0 ? 'min-h-[70px]' :
          count === 1 ? 'min-h-[120px]' :
          count === 2 ? 'min-h-[130px]' : 'min-h-[150px]'
        const containerClass = count <= 1 ? 'h-full block' : 'h-full grid gap-[6px]'
        const gridTemplate = count === 2 ? 'grid-cols-1' : 'grid-cols-2'
        return (
          <div key={iso} className={dayMinH}>
            <div className={`h-full rounded-xl border ${inMonth ? 'bg-white' : 'bg-white/70'} shadow-sm p-1.5 relative`}>
              <div className="absolute -top-2 -left-2 z-10">
                <div className="px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm bg-white text-gray-600">{dayNum}</div>
              </div>
              <div className={[containerClass, count > 1 ? gridTemplate : ''].join(' ')}>
                {count === 0 && <div className="w-full h-full rounded-lg border border-dashed bg-white/60" />}
                {count === 1 && <MiniProjectCard iso={iso} p={pDay[0]} big full />}
                {count === 2 && pDay.map((p, i) => <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} variant="bar" />)}
                {count > 2 && pDay.map((p, i) => <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} compact />)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==== tarjeta proyecto ==== */
function MiniProjectCard({ iso, p, big = false, variant, full = false, compact = false }: { iso: string; p: Project; big?: boolean; variant?: 'bar'; full?: boolean; compact?: boolean }) {
  const nav = useNavigate()
  const phase = phaseForDay(p, iso)
  const { style, dashed } = colorForProject(p)
  const size = variant === 'bar'
    ? 'px-2 py-2 flex items-center justify-between'
    : big
      ? 'p-2 flex flex-col justify-between min-h-[90px]'
      : 'p-1.5 flex flex-col justify-between min-h-[50px]'
  return (
    <button
      onClick={() => nav(`/project/${p.id}`)}
      className={[
        full || variant === 'bar' ? 'rounded-lg' : 'rounded-md',
        'border text-left transition hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer',
        dashed ? 'border-dashed' : '',
        size,
        full ? 'w-full h-full' : ''
      ].join(' ')}
      style={style as any}
    >
      {variant === 'bar' ? (
        <>
          <div className="text-[11px] leading-tight font-medium truncate pr-2">{p.name}</div>
          <span className="inline-flex items-center justify-center rounded-full border bg-white/60 backdrop-blur w-4 h-4 text-[10px]">{phase}</span>
        </>
      ) : compact ? (
        <div className="w-full h-full relative flex items-stretch">
          <div className="flex-1 flex items-center justify-start pl-1">
            <span className="font-semibold tracking-wide text-[10px] opacity-85">{initials(p.name)}</span>
          </div>
          <div className="absolute right-1 bottom-1">
            <span className="inline-flex items-center justify-center rounded-full border bg-white/60 backdrop-blur w-4 h-4 text-[9px]">{phase}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[10px] leading-tight font-medium truncate">{p.name}</div>
          <div className="flex items-center justify-end">
            <span className="inline-flex items-center justify-center rounded-full border bg-white/60 backdrop-blur w-4 h-4 text-[9px]">{phase}</span>
          </div>
        </>
      )}
    </button>
  )
}

/* ==== leyenda ==== */
function Legend({ projects }: { projects: Project[] }) {
  const nav = useNavigate()
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Proyectos del mes</div>
      <div className="flex flex-wrap gap-1.5">
        {projects.map(p => {
          const { style, dashed } = colorForProject(p)
          return (
            <button
              key={p.id}
              onClick={() => nav(`/project/${p.id}`)}
              title={p.name}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition hover:brightness-95 active:brightness-90 ${dashed ? 'border-dashed' : ''}`}
              style={style as any}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 bg-white/50" />
              <span className="truncate max-w-[140px]
