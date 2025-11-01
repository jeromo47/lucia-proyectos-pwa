import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import { getProjects, type Project } from '@/lib/repo'

/* ============================
   Utilidades de fecha (UTC)
   ============================ */
const WEEK_START_MONDAY = true

function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function toISO(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}
function todayISO() {
  const d = new Date()
  return toISO(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())))
}
function addDaysISO(iso: string, days: number) {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}
function startOfMonthISO(d: Date) { return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))) }
function endOfMonthISO(d: Date) { return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))) }
function dayOfWeekISO(iso: string) { return parseISO(iso).getUTCDay() }
function startOfCalendarISO(monthStartISO: string) {
  const dow = dayOfWeekISO(monthStartISO)
  if (WEEK_START_MONDAY) { const shift = dow === 0 ? 6 : dow - 1; return addDaysISO(monthStartISO, -shift) }
  return addDaysISO(monthStartISO, -dow)
}
function endOfCalendarISO(monthEndISO: string) {
  const dow = dayOfWeekISO(monthEndISO)
  if (WEEK_START_MONDAY) { const shift = dow === 0 ? 0 : 7 - dow; return addDaysISO(monthEndISO, shift) }
  const shift = 6 - dow; return addDaysISO(monthEndISO, shift)
}
function eachDayISO(startISO: string, endISO: string) {
  const out: string[] = []
  let cur = startISO
  while (cur <= endISO) { out.push(cur); cur = addDaysISO(cur, 1) }
  return out
}

/* ============================
   Estética y helpers
   ============================ */
function initials(name?: string, maxLetters = 3) {
  const n = (name || '').trim()
  if (!n) return ''
  const parts = n.split(/\s+/).slice(0, 3)
  let chars = parts.map(w => w[0] ?? '').join('')
  if (parts.length === 1 && n.length >= 2) chars = n.slice(0, 2)
  return chars.toUpperCase().slice(0, maxLetters)
}
const PASTEL = [
  { bg: 'hsl(190 80% 94%)', text: 'hsl(190 40% 26%)', border: 'hsl(190 45% 70%)' },
  { bg: 'hsl(280 70% 95%)', text: 'hsl(280 35% 30%)', border: 'hsl(280 45% 70%)' },
  { bg: 'hsl(25 85% 94%)',  text: 'hsl(25 45% 30%)',  border: 'hsl(25 55% 70%)'  },
  { bg: 'hsl(140 60% 93%)', text: 'hsl(140 35% 26%)', border: 'hsl(140 45% 66%)' },
  { bg: 'hsl(45 85% 92%)',  text: 'hsl(45 45% 28%)',  border: 'hsl(45 55% 68%)'  },
]
function hashString(s: string) { let h = 2166136261; for (let i=0;i<s.length;i++){h^=s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)} return Math.abs(h) }
function colorForProject(p: Project) {
  if (!p.confirmed) {
    return { style: { backgroundColor: 'hsl(0 90% 96%)', color: 'hsl(0 60% 30%)', borderColor: 'hsl(0 70% 72%)' }, dashed: true }
  }
  const key = p.id || p.name || 'x'
  const sw = PASTEL[hashString(key) % PASTEL.length]
  return { style: { backgroundColor: sw.bg, color: sw.text, borderColor: sw.border }, dashed: false }
}

/* ============================
   Fases y rangos
   ============================ */
type PhaseKey = 'P'|'F'|'R'|null
function phaseForDay(p: Project, iso: string): PhaseKey {
  if (p.prepStart && p.prepEnd && p.prepStart <= iso && iso <= p.prepEnd) return 'P'
  if (p.fittingStart && p.fittingEnd && p.fittingStart <= iso && iso <= p.fittingEnd) return 'F'
  if (p.rodajeStart && p.rodajeEnd && p.rodajeStart <= iso && iso <= p.rodajeEnd) return 'R'
  return null
}
function projectTotalRange(p: Project){ const start = p.prepStart ?? p.rodajeStart ?? null; const end = p.rodajeEnd ?? null; return { start, end } }
function dayInTotalRange(p: Project, iso: string){ const {start,end}=projectTotalRange(p); return !!(start&&end&&start<=iso&&iso<=end) }

/* ============================
   Hooks utilitarios
   ============================ */
function useHideIfOverflow() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const update = () => setVisible(el.scrollWidth <= el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, visible }
}
function useIsPortrait() {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = () => setPortrait(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)
    return () => { mq.removeEventListener('change', onChange); window.removeEventListener('resize', onChange) }
  }, [])
  return portrait
}
function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const onChange = () => setMobile(window.innerWidth < 768)
    onChange()
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])
  return mobile
}

/* ============================
   Popover
   ============================ */
type PreviewState = { project: Project | null, x: number, y: number }
function usePreview() {
  const [state, setState] = useState<PreviewState>({ project: null, x: 0, y: 0 })
  const open = useCallback((project: Project, x: number, y: number) => {
    const margin = 12
    const vw = window.innerWidth, vh = window.innerHeight
    const px = Math.min(Math.max(margin, x), vw - margin)
    const py = Math.min(Math.max(margin, y), vh - margin)
    setState({ project, x: px, y: py })
  }, [])
  const close = useCallback(() => setState({ project: null, x: 0, y: 0 }), [])
  return { state, open, close }
}
function Popover({ state, onClose }: { state: PreviewState, onClose: () => void }) {
  const nav = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent){ if(e.key==='Escape') onClose() }
    function onClick(e: MouseEvent | TouchEvent){
      if(!boxRef.current) return
      if(!boxRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('touchstart', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('touchstart', onClick)
    }
  }, [onClose])

  if(!state.project) return null
  const p = state.project

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto" />
      <div
        ref={boxRef}
        className="absolute pointer-events-auto translate-x-[-50%] translate-y-[-50%] rounded-xl border shadow-lg bg-white p-3 w-[240px] max-w-[85vw]"
        style={{ left: state.x, top: state.y }}
      >
        <div className="text-sm font-medium truncate mb-2" title={p.name || 'Proyecto'}>
          {p.name || 'Proyecto'}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button className="px-2 py-1 text-sm rounded-lg border hover:bg-gray-50" onClick={onClose}>Cerrar</button>
          <button className="px-2.5 py-1 text-sm rounded-lg border bg-black text-white hover:bg-black/90" onClick={() => nav(`/project/${p.id}`)}>Ver</button>
        </div>
      </div>
    </div>
  )
}

/* ============================
   Tarjeta de proyecto
   ============================ */
function MiniProjectCard({
  iso, p, variant, full=false, compact=false, onPreview
}: {
  iso:string; p:Project; variant?:'bar'; full?:boolean; compact?:boolean;
  onPreview?:(p:Project,x:number,y:number)=>void
}){
  const phase = phaseForDay(p,iso)
  const { style, dashed } = colorForProject(p)
  const { ref, visible } = useHideIfOverflow()
  const nameText = p.name || 'Sin título'

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onPreview) return
    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    onPreview(p, r.left + r.width/2, r.top + r.height/2)
  }

  const titleClass =
    variant==='bar' ? 'text-[10px] font-medium' :
    compact        ? 'text-[10px] font-semibold tracking-wide' :
                     'text-[11px] font-medium'

  return (
    <button
      onClick={handleClick}
      className={[
        full || variant==='bar' ? 'rounded-lg' : 'rounded-md',
        'relative border-[1.5px] text-left transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/15',
        dashed ? 'border-dashed' : '',
        full ? 'w-full h-full p-2.5' : 'p-2'
      ].join(' ')}
      style={style as any}
      title={nameText}
      aria-label={`Abrir ${nameText}`}
    >
      <div
        ref={ref}
        className={`absolute top-1 left-1 pr-6 max-w-[80%] truncate pointer-events-none ${titleClass}`}
        title={nameText}
      >
        {visible ? nameText : initials(nameText)}
      </div>

      <span
        className={[
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'inline-flex items-center justify-center rounded-full border bg-white/85 shadow-sm',
          compact || variant==='bar' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-[11px]',
          dashed ? 'border-red-400 text-red-700' : 'border-black/20 text-black/70',
        ].join(' ')}
      >
        {phase ?? ''}
      </span>
    </button>
  )
}

/* ============================
   Calendar Grid con altura uniforme por semana
   ============================ */
function heightClassByCount(count: number) {
  if (count <= 0) return 'min-h-[64px]'
  if (count === 1) return 'min-h-[120px]'
  if (count === 2) return 'min-h-[132px]'
  return 'min-h-[148px]'
}
function chunkWeeks(days: string[]) {
  const out: string[][] = []
  for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7))
  return out
}

function CalendarGrid({
  items, monthStart, monthEnd, calStart, calEnd, onPreview, epoch = 0,
}: {
  items: Project[]; monthStart: string; monthEnd: string; calStart: string; calEnd: string;
  onPreview: (p:Project,x:number,y:number)=>void; epoch?: number
}) {
  const days = useMemo(() => eachDayISO(calStart, calEnd), [calStart, calEnd])

  // Precompute proyectos por día
  const mapProjects = useMemo(() => {
    const m = new Map<string, { list: Project[]; count: number }>()
    for (const iso of days) {
      const inRange = items.filter(p => dayInTotalRange(p, iso))
      const conf = inRange.filter(p => p.confirmed)
      const pend = inRange.filter(p => !p.confirmed)
      const list = [...conf.slice(0, 4), ...pend.slice(0, Math.max(0, 4 - conf.length))].slice(0, 4)
      m.set(iso, { list, count: list.length })
    }
    return m
  }, [days, items])

  const weeks = useMemo(() => chunkWeeks(days), [days])

  return (
    <div key={epoch} className="calendar divide-y divide-transparent">
      {weeks.map((week, wIdx) => {
        const maxCount = Math.max(...week.map(d => mapProjects.get(d)?.count ?? 0))
        const hClass = heightClassByCount(maxCount)

        return (
          <div key={wIdx} className="grid grid-cols-7 gap-[4px] md:gap-1 p-[4px] bg-gray-100">
            {week.map(iso => {
              const inMonth = iso >= monthStart && iso <= monthEnd
              const dayNum  = parseISO(iso).getUTCDate()
              const entry   = mapProjects.get(iso)!
              const pDay    = entry.list
              const count   = entry.count

              const layout = count <= 1 ? 'h-full block' : `h-full grid gap-1 ${count === 2 ? 'grid-cols-1' : 'grid-cols-2'}`

              return (
                <div key={iso} className={hClass}>
                  <div className={`h-full rounded-2xl border shadow-sm p-2 relative ${inMonth ? 'bg-white' : 'bg-white/80'}`}>
                    <div className="absolute -top-2 -left-2 z-10">
                      <div className="px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm bg-white text-gray-600">{dayNum}</div>
                    </div>

                    <div className={layout}>
                      {count === 0 && <div className="w-full h-full" />}
                      {count === 1 && <MiniProjectCard iso={iso} p={pDay[0]} full onPreview={onPreview} />}
                      {count === 2 && pDay.map((p, i) => (
                        <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} variant="bar" onPreview={onPreview} />
                      ))}
                      {count > 2 && pDay.map((p, i) => (
                        <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} compact onPreview={onPreview} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ============================
   Leyenda
   ============================ */
function Legend({ projects }: { projects: Project[] }) {
  const nav = useNavigate()
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Proyectos del mes</p>
      <div className="flex flex-wrap gap-1.5">
        {projects.map(p => {
          const { style, dashed } = colorForProject(p)
          return (
            <button
              key={p.id}
              onClick={() => nav(`/project/${p.id}`)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${dashed ? 'border-dashed' : ''}`}
              style={style as any}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 bg-white/50" />
              <span className="truncate max-w-[140px]">{p.name}</span>
              {!p.confirmed && <span className="ml-1 text-[10px] text-red-700">Pendiente</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ============================
   Página
   ============================ */
export default function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthISO(parseISO(todayISO())))
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const preview = usePreview()

  const isPortrait = useIsPortrait()
  const isMobile = useIsMobile()
  const lockVertical = isMobile && isPortrait

  useEffect(()=>{(async()=>{
    try{ const data = await getProjects(); setItems(data); setError(null) }
    catch(e:any){ setError(e?.message ?? 'Error cargando calendario') }
    finally{ setLoading(false) }
  })()},[])

  // Re-render al girar / cambiar viewport para recomponer alturas
  useEffect(() => {
    const bump = () => setLayoutEpoch(e => e + 1)
    window.addEventListener('orientationchange', bump)
    window.addEventListener('resize', bump)
    return () => { window.removeEventListener('orientationchange', bump); window.removeEventListener('resize', bump) }
  }, [])

  const monthStart = monthAnchor
  const monthEnd = endOfMonthISO(parseISO(monthStart))
  const calStart = startOfCalendarISO(monthStart)
  const calEnd = endOfCalendarISO(monthEnd)

  const legendProjects = useMemo(
    () => items.filter(p => {
      const rng = projectTotalRange(p)
      if (!rng.start || !rng.end) return false
      return !(rng.end < calStart || rng.start > calEnd)
    }),
    [items, calStart, calEnd]
  )

  function gotoMonth(delta:number){ const d=parseISO(monthStart); d.setUTCMonth(d.getUTCMonth()+delta,1); setMonthAnchor(startOfMonthISO(d)) }

  return (
    <div className="h-full flex flex-col relative select-none">
      <HeaderBar/>
      <div className={`p-3 md:p-6 space-y-3 ${lockVertical ? 'pointer-events-none blur-[1px]' : ''}`} aria-hidden={lockVertical}>
        <div className="flex items-center justify-center gap-2">
          <button onClick={()=>gotoMonth(-1)} className="px-2.5 py-1.5 rounded-lg border text-sm">←</button>
          <div className="text-base md:text-lg font-medium">
            {new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(parseISO(monthStart))}
          </div>
          <button onClick={()=>gotoMonth(1)} className="px-2.5 py-1.5 rounded-lg border text-sm">→</button>
        </div>

        {loading && <div className="text-center text-gray-500 text-sm">Cargando…</div>}
        {error && <div className="text-center text-red-600 text-sm">{error}</div>}

        {!loading && !error && (
          <>
            <div className="rounded-2xl border shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50 text-[11px] text-gray-600">
                {(WEEK_START_MONDAY?['L','M','X','J','V','S','D']:['D','L','M','X','J','V','S']).map(d=>(
                  <div key={d} className="px-2 py-2 border-b font-medium">{d}</div>
                ))}
              </div>
              <CalendarGrid
                items={items}
                monthStart={monthStart}
                monthEnd={monthEnd}
                calStart={calStart}
                calEnd={calEnd}
                onPreview={preview.open}
                epoch={layoutEpoch}
              />
            </div>
            {legendProjects.length > 0 && <Legend projects={legendProjects} />}
          </>
        )}
      </div>

      {lockVertical && (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm text-gray-800">
          <svg width="66" height="66" viewBox="0 0 24 24" className="mb-3 opacity-80">
            <rect x="3" y="6" width="18" height="12" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 3h10M7 21h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4 16a4 4 0 0 1 0-8M20 8a4 4 0 0 1 0 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
          <div className="text-sm font-medium">Poner en horizontal</div>
        </div>
      )}

      <Popover state={preview.state} onClose={preview.close}/>
    </div>
  )
}
