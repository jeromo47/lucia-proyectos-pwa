import { useEffect, useMemo, useState } from 'react'
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

/* ===== colores pastel ===== */
const PASTEL = [
  { bg: 'hsl(190 80% 94%)', text: 'hsl(190 40% 26%)', border: 'hsl(190 45% 70%)' },
  { bg: 'hsl(280 70% 95%)', text: 'hsl(280 35% 30%)', border: 'hsl(280 45% 70%)' },
  { bg: 'hsl(25 85% 94%)',  text: 'hsl(25 45% 30%)',  border: 'hsl(25 55% 70%)'  },
  { bg: 'hsl(140 60% 93%)', text: 'hsl(140 35% 26%)', border: 'hsl(140 45% 66%)' },
  { bg: 'hsl(45 85% 92%)',  text: 'hsl(45 45% 28%)',  border: 'hsl(45 55% 68%)'  },
  { bg: 'hsl(210 70% 93%)', text: 'hsl(210 40% 28%)', border: 'hsl(210 50% 66%)' },
  { bg: 'hsl(320 70% 94%)', text: 'hsl(320 40% 30%)', border: 'hsl(320 50% 70%)' },
]

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
function overlapsCalendar(p: Project, calStart: string, calEnd: string) {
  const { start, end } = projectTotalRange(p)
  if (!start || !end) return false
  return !(end < calStart || start > calEnd)
}

/* ===== componente ===== */
function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthISO(parseISO(todayISO())))
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

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

  // Leyenda (restaurada)
  const legendProjects = useMemo(() => {
    return items.filter(p => overlapsCalendar(p, calStart, calEnd))
      .sort((a,b)=> (a.confirmed===b.confirmed ? (a.name||'').localeCompare(b.name||'') : a.confirmed? -1: 1))
  }, [items, calStart, calEnd])

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
              />
            </div>

            {legendProjects.length>0 && <Legend projects={legendProjects}/>}
          </>
        )}
      </div>
    </div>
  )
}

/* ===== grid ===== */
function CalendarGrid({
  items, monthStart, monthEnd, calStart, calEnd
}:{items:Project[], monthStart:string, monthEnd:string, calStart:string, calEnd:string}){
  const days = useMemo(()=>eachDayISO(calStart,calEnd),[calStart,calEnd])

  return (
    <div className="grid grid-cols-7 gap-[4px] md:gap-1 p-[4px] bg-gray-100">
      {days.map(iso=>{
        const inMonth = iso>=monthStart && iso<=monthEnd
        const dayNum  = parseISO(iso).getUTCDate()

        // Proyectos del día (máx 4), confirmados primero
        const all  = items.filter(p=>dayInTotalRange(p,iso))
        const conf = all.filter(p=>p.confirmed)
        const pend = all.filter(p=>!p.confirmed)
        const dayProjects = [...conf.slice(0,4), ...pend.slice(0,Math.max(0,4-conf.length))].slice(0,4)
        const count = dayProjects.length

        // Índices de color únicos por día
        const colorIdxs = dayProjects.map((_, i)=> i % PASTEL.length)

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

              <div className={layout}>
                {count===0 && <div className="w-full h-full" />}

                {count===1 && (
                  <MiniProjectCard iso={iso} p={dayProjects[0]} big full colorIdxOverride={colorIdxs[0]}/>
                )}

                {count===2 && dayProjects.map((p,i)=>(
                  <MiniProjectCard key={p.id+iso+i} iso={iso} p={p} variant="bar" colorIdxOverride={colorIdxs[i]}/>
                ))}

                {count>2 && dayProjects.map((p,i)=>(
                  <MiniProjectCard key={p.id+iso+i} iso={iso} p={p} compact colorIdxOverride={colorIdxs[i]}/>
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
  iso, p, big=false, variant, full=false, compact=false, colorIdxOverride
}: {
  iso:string; p:Project; big?:boolean; variant?:'bar'; full?:boolean; compact?:boolean; colorIdxOverride?: number
}){
  const nav = useNavigate()
  const phase = phaseForDay(p,iso)

  // Color por override (día) o, si no, por estado
  const dashed = !p.confirmed
  const color = colorIdxOverride!=null ? PASTEL[colorIdxOverride % PASTEL.length] : (
    dashed ? { bg:'hsl(0 90% 96%)', text:'hsl(0 60% 30%)', border:'hsl(0 70% 72%)' } : PASTEL[0]
  )
  const style = dashed
    ? { backgroundColor:'hsl(0 90% 96%)', color:'hsl(0 60% 30%)', borderColor:'hsl(0 70% 72%)' }
    : { backgroundColor: color.bg, color: color.text, borderColor: color.border }

  const base =
    variant==='bar'
      ? 'px-2 py-2 flex items-center justify-between'
      : big
        ? 'p-2.5 flex flex-col justify-between min-h-[96px]'
        : 'p-2 flex flex-col justify-between min-h-[54px]'

  return (
    <button
      onClick={()=>nav(`/project/${p.id}`)}
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
        // En barras mantenemos el texto, pero si no cabe, el truncate lo oculta
        <>
          <div className="text-[10px] leading-tight font-medium truncate pr-2">{p.name||'Sin título'}</div>
          <span className={[
            'inline-flex items-center justify-center rounded-full border bg-white/70',
            'w-4 h-4 text-[10px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'
          ].join(' ')}>{phase??''}</span>
        </>
      ) : compact ? (
        // 👉 Compacto: SIN texto / siglas. Solo la burbuja de fase.
        <div className="w-full h-full relative">
          <span className={[
            'absolute right-1 bottom-1 inline-flex items-center justify-center rounded-full border bg-white/70',
            'w-3.5 h-3.5 text-[9px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'
          ].join(' ')}>{phase??''}</span>
        </div>
      ) : (
        // 1 proyecto (bloque grande): texto truncado + burbuja
        <>
          <div className="text-[11px] leading-tight font-medium truncate">{p.name||'Sin título'}</div>
          <div className="flex items-center justify-end">
            <span className={[
              'inline-flex items-center justify-center rounded-full border bg-white/70',
              'w-4 h-4 text-[10px]', dashed?'border-red-400 text-red-700':'border-black/20 text-black/70'
            ].join(' ')}>{phase??''}</span>
          </div>
        </>
      )}
    </button>
  )
}

/* ===== leyenda ===== */
function Legend({ projects }: { projects: Project[] }) {
  const nav = useNavigate()
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Proyectos del mes</p>
      <div className="flex flex-wrap gap-1.5">
        {projects.map((p, i) => {
          const dashed = !p.confirmed
          const idx = i % PASTEL.length
          const sw = dashed
            ? { bg:'hsl(0 90% 96%)', text:'hsl(0 60% 30%)', border:'hsl(0 70% 72%)' }
            : PASTEL[idx]
          return (
            <button
              key={p.id}
              onClick={() => nav(`/project/${p.id}`)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${dashed ? 'border-dashed' : ''}`}
              style={{ backgroundColor: sw.bg, color: sw.text, borderColor: sw.border } as any}
              title={p.name}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 bg-white/50" />
              <span className="truncate max-w-[160px]">{p.name || 'Sin título'}</span>
              {!p.confirmed && <span className="ml-1 text-[10px] text-red-700">Pendiente</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarPage
