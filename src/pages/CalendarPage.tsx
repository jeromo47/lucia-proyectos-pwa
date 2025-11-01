import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderBar from '@/components/HeaderBar'
import { getProjects, type Project } from '@/lib/repo'

const WEEK_START_MONDAY = true

/* ===== fechas ===== */
function todayISO() {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
}
function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function toISO(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
}
function addDaysISO(iso: string, days: number) {
  const d = parseISO(iso); d.setUTCDate(d.getUTCDate() + days); return toISO(d)
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
  const out: string[] = []; let cur = startISO; while (cur <= endISO) { out.push(cur); cur = addDaysISO(cur, 1) } return out
}

/* ===== helper iniciales ===== */
function initials(name?: string, maxLetters = 3) {
  const n = (name || '').trim(); if (!n) return ''
  const parts = n.split(/\s+/).slice(0, 3)
  let chars = parts.map(w => w[0] ?? '').join('')
  if (parts.length === 1 && n.length >= 2) chars = n.slice(0, 2)
  return chars.toUpperCase().slice(0, maxLetters)
}

/* ===== colores ===== */
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

/* ===== fases / rangos ===== */
type PhaseKey = 'P'|'F'|'R'|null
function phaseForDay(p: Project, iso: string): PhaseKey {
  if (p.prepStart && p.prepEnd && p.prepStart <= iso && iso <= p.prepEnd) return 'P'
  if (p.fittingStart && p.fittingEnd && p.fittingStart <= iso && iso <= p.fittingEnd) return 'F'
  if (p.rodajeStart && p.rodajeEnd && p.rodajeStart <= iso && iso <= p.rodajeEnd) return 'R'
  return null
}
function projectTotalRange(p: Project){ const start = p.prepStart ?? p.rodajeStart ?? null; const end = p.rodajeEnd ?? null; return { start, end } }
function dayInTotalRange(p: Project, iso: string){ const {start,end}=projectTotalRange(p); return !!(start&&end&&start<=iso&&iso<=end) }

/* ===== popover (vista previa) ===== */
type PreviewState = { project: Project | null, x: number, y: number }
function usePreview() {
  const [state, setState] = useState<PreviewState>({ project: null, x: 0, y: 0 })
  const open = useCallback((project: Project, x: number, y: number) => {
    // corrige posiciones para que no se salga por los bordes
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent){ if(e.key==='Escape') onClose() }
    function onClick(e: MouseEvent){
      if(!ref.current) return
      if(!ref.current.contains(e.target as Node)) onClose()
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
      {/* fondo clicable */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto" />
      {/* tarjeta */}
      <div
        ref={ref}
        className="absolute pointer-events-auto translate-x-[-50%] translate-y-[-100%] rounded-xl border shadow-lg bg-white p-3 w-[240px] max-w-[85vw]"
        style={{ left: state.x, top: state.y }}
      >
        <div className="text-sm font-medium truncate mb-2" title={p.name || 'Proyecto'}>
          {p.name || 'Proyecto'}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-2 py-1 text-sm rounded-lg border hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            className="px-2.5 py-1 text-sm rounded-lg border bg-black text-white hover:bg-black/90"
            onClick={() => nav(`/project/${p.id}`)}
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  )
}

/* ===== componente ===== */
function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthISO(parseISO(todayISO())))
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

  const preview = usePreview()

  useEffect(()=>{(async()=>{
    try{ const data = await getProjects(); setItems(data); setError(null) }
    catch(e:any){ setError(e?.message ?? 'Error cargando calendario') }
    finally{ setLoading(false) }
  })()},[])

  const monthStart = monthAnchor
  const monthEnd = endOfMonthISO(parseISO(monthStart))
  const calStart = startOfCalendarISO(monthStart)
  const calEnd   = endOfCalendarISO(monthEnd)

  function gotoMonth(delta:number){ const d=parseISO(monthStart); d.setUTCMonth(d.getUTCMonth()+delta,1); setMonthAnchor(startOfMonthISO(d)) }

  return (
    <div className="h-full flex flex-col">
      <HeaderBar/>
      <div className="p-3 md:p-6 space-y-3">
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
              calStart={startOfCalendarISO(monthStart)}
              calEnd={endOfCalendarISO(monthEnd)}
              onPreview={preview.open}
            />
          </div>
        )}
      </div>

      {/* Popover de vista previa */}
      <Popover state={preview.state} onClose={preview.close}/>
    </div>
  )
}

/* ===== grid ===== */
function CalendarGrid({
  items,monthStart,monthEnd,calStart,calEnd,onPreview
}:{items:Project[],monthStart:string,monthEnd:string,calStart:string,calEnd:string,onPreview:(p:Project,x:number,y:number)=>void}){
  const days = useMemo(()=>eachDayISO(calStart,calEnd),[calStart,calEnd])
  return (
    <div className="grid grid-cols-7 gap-[4px] md:gap-1 p-[4px] bg-gray-100">
      {days.map(iso=>{
        const inMonth = iso>=monthStart && iso<=monthEnd
        const dayNum  = parseISO(iso).getUTCDate()

        const pAll  = items.filter(p=>dayInTotalRange(p,iso))
        const pConf = pAll.filter(p=>p.confirmed)
        const pPend = pAll.filter(p=>!p.confirmed)
        const pDay  = [...pConf.slice(0,4), ...pPend.slice(0,Math.max(0,4-pConf.length))].slice(0,4)
        const count = pDay.length

        const minH =
          count===0 ? 'min-h-[64px]' :
          count===1 ? 'min-h-[118px]' :
          count===2 ? 'min-h-[128px]' : 'min-h-[144px]'

        const layout = count<=1 ? 'h-full block' : `h-full grid gap-1 ${count===2?'grid-cols-1':'grid-cols-2'}`

        return (
          <div key={iso} className={minH}>
            <div className={`h-full rounded-xl border ${inMonth?'bg-white':'bg-white/80'} shadow-sm p-2 relative`}>
              {/* Etiqueta día */}
              <div className="absolute -top-2 -left-2 z-10">
                <div className="px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm bg-white text-gray-600">{dayNum}</div>
              </div>

              {/* Contenido */}
              <div className={layout}>
                {count===0 && <div className="w-full h-full" />}
                {count===1 && <MiniProjectCard iso={iso} p={pDay[0]} big full onPreview={onPreview} />}
                {count===2 && pDay.map((p,i)=>(
                  <MiniProjectCard key={p.id+iso+i} iso={iso} p={p} variant="bar" onPreview={onPreview}/>
                ))}
                {count>2 && pDay.map((p,i)=>(
                  <MiniProjectCard key={p.id+iso+i} iso={iso} p={p} compact onPreview={onPreview}/>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ===== tarjeta ===== */
function MiniProjectCard({
  iso, p, big=false, variant, full=false, compact=false, onPreview
}: {
  iso:string; p:Project; big?:boolean; variant?:'bar'; full?:boolean; compact?:boolean;
  onPreview?:(p:Project,x:number,y:number)=>void
}){
  const phase = phaseForDay(p,iso)
  const { style, dashed } = colorForProject(p)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onPreview) {
      const x = e.clientX || (e.nativeEvent as any).clientX || window.innerWidth/2
      const y = e.clientY || (e.nativeEvent as any).clientY || window.innerHeight/2
      onPreview(p, x, y)
    }
  }

  const base =
    variant==='bar'
      ? 'px-2 py-2 flex items-center justify-between'
      : big
        ? 'p-2.5 flex flex-col justify-between min-h-[96px]'
        : 'p-2 flex flex-col justify-between min-h-[54px]'

  return (
    <button
      onClick={handleClick}
      className={[
        full || variant==='bar' ? 'rounded-lg' : 'rounded-md',
        'border text-left transition hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-black/10',
        dashed ? 'border-dashed' : '',
        base,
        full ? 'w-full h-full' : ''
      ].join(' ')}
      style={style as any}
      title={p.name}
      aria-label={`Abrir ${p.name||'proyecto'}`}
    >
      {variant==='bar' ? (
        <>
          <div className="text-[11px] leading-tight font-medium truncate pr-2">{p.name||'Sin título'}</div>
          <span className={['inline-flex items-center justify-center rounded-full border bg-white/70',
            'w-4 h-4 text-[10px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'].join(' ')}>
            {phase??''}
          </span>
        </>
      ) : compact ? (
        <div className="w-full h-full relative flex items-stretch">
          <div className="flex-1 flex items-center justify-start">
            <span className="font-semibold tracking-wide text-[10px]">{initials(p.name)}</span>
          </div>
          <div className="absolute right-1 bottom-1">
            <span className={['inline-flex items-center justify-center rounded-full border bg-white/70',
              'w-3.5 h-3.5 text-[9px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'].join(' ')}>
              {phase??''}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[11px] leading-tight font-medium truncate">{p.name||'Sin título'}</div>
          <div className="flex items-center justify-end">
            <span className={['inline-flex items-center justify-center rounded-full border bg-white/70',
              'w-4 h-4 text-[10px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'].join(' ')}>
              {phase??''}
            </span>
          </div>
        </>
      )}
    </button>
  )
}

export default CalendarPage
