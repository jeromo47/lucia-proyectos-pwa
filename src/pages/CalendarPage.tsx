// … (todo igual que tu versión actual, solo cambian dos bloques marcados)

// ——————————— CalendarGrid: celdas del calendario ———————————
function CalendarGrid({
  items, monthStart, monthEnd, calStart, calEnd
}: { items: Project[], monthStart: string, monthEnd: string, calStart: string, calEnd: string }) {
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
          count === 0 ? 'min-h-[64px] md:min-h-[78px]' :
          count === 1 ? 'min-h-[90px] md:min-h-[110px]' :
                         'min-h-[110px] md:min-h-[120px]'

        const containerClass =
          count <= 1 ? 'h-full block' : 'h-full grid gap-1'
        const gridTemplate =
          count === 2
            ? 'grid-cols-1 auto-rows-[minmax(44px,1fr)]'
            : count === 3
              ? 'grid-cols-2 auto-rows-[minmax(44px,1fr)]'
              : 'grid-cols-2 auto-rows-[minmax(44px,1fr)]'

        return (
          <div key={iso} className={dayMinH}>
            <div className={`h-full rounded-xl border ${inMonth ? 'bg-white' : 'bg-white/70'} shadow-sm p-1.5 md:p-2 relative`}>
              {/* chip fecha */}
              <div className="absolute -top-2 -left-2">
                <div className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-[11px] border shadow-sm ${inMonth ? 'bg-white' : 'bg-gray-50'} text-gray-600`}>
                  {dayNum}
                </div>
              </div>

              <div className={[containerClass, count > 1 ? gridTemplate : ''].join(' ')}>
                {count === 0 && (
                  <div className="w-full h-full rounded-lg border border-dashed bg-white/60" />
                )}

                {/* ✅ CAMBIO: cuando hay 1 proyecto, ocupa TODO el ancho/alto */}
                {count === 1 && (
                  <div className="w-full h-full">
                    <MiniProjectCard iso={iso} p={pDay[0]} big full />
                  </div>
                )}

                {count === 2 && pDay.map((p, i) => (
                  <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} variant="bar" />
                ))}

                {count > 2 && pDay.map((p, i) => (
                  <MiniProjectCard key={p.id + iso + i} iso={iso} p={p} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ——————————— MiniProjectCard: añade prop `full` ———————————
function MiniProjectCard({
  iso, p, big = false, variant, full = false
}: { iso: string; p: Project; big?: boolean; variant?: 'bar'; full?: boolean }) {
  const nav = useNavigate()
  const phase = phaseForDay(p, iso)
  const { style, dashed } = colorForProject(p)

  const size =
    variant === 'bar'
      ? 'px-2 py-2 md:px-2.5 md:py-2.5 flex items-center justify-between'
      : big
        ? 'p-1.5 md:p-2 flex flex-col justify-between min-h-[76px] md:min-h-[90px]'
        : 'p-1 md:p-1.5 flex flex-col justify-between min-h-[42px] md:min-h-[50px]'

  return (
    <button
      onClick={() => nav(`/project/${p.id}`)}
      aria-label={`Abrir ${p.name || 'proyecto'}`}
      className={[
        'rounded-lg border text-left transition',
        'hover:brightness-95 active:brightness-90',
        'focus:outline-none focus:ring-2 focus:ring-black/10',
        'cursor-pointer',
        dashed ? 'border-dashed' : '',
        size,
        full ? 'w-full h-full' : ''
      ].join(' ')}
      style={style as any}
      title={p.name}
    >
      {variant === 'bar' ? (
        <>
          <div className="text-[11px] md:text-[12px] leading-tight font-medium truncate pr-2">
            {p.name || 'Sin título'}
          </div>
          <span className="inline-flex items-center justify-center rounded-full border bg-white/60 backdrop-blur text-[10px] md:text-[11px] w-5 h-5 md:w-6 md:h-6">
            {phase ?? ''}
          </span>
        </>
      ) : (
        <>
          <div className="text-[10px] md:text-[11px] leading-tight font-medium truncate">
            {p.name || 'Sin título'}
          </div>
          <div className="flex items-center justify-end">
            <span className="inline-flex items-center justify-center rounded-full border bg-white/60 backdrop-blur text-[9px] md:text-[10px] w-4 h-4 md:w-5 md:h-5">
              {phase ?? ''}
            </span>
          </div>
        </>
      )}
    </button>
  )
}
