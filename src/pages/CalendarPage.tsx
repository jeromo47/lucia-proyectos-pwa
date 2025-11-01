function MiniProjectCard({
  iso, p, big=false, variant, full=false, compact=false, onPreview
}: {
  iso:string; p:Project; big?:boolean; variant?:'bar'; full?:boolean; compact?:boolean;
  onPreview?:(p:Project,x:number,y:number)=>void
}){
  const phase = phaseForDay(p,iso)
  const { style, dashed } = colorForProject(p)

  // Clic → centra popover en el bloque
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onPreview) return
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    onPreview(p, cx, cy)
  }

  const base =
    variant==='bar'
      ? 'px-2 pt-1.5 pb-2'                    // margen superior para el título
      : big
        ? 'p-2.5'                             // bloque grande
        : 'p-2'                               // bloque compacto

  // Título pequeño que se oculta si no cabe
  const TitleSmall = ({ text, className='' }:{text?:string,className?:string}) => {
    const { ref, visible } = useHideIfOverflow()
    if (!text) return null
    return visible ? (
      <div ref={ref} className={`truncate ${className}`} title={text}>{text}</div>
    ) : null
  }

  return (
    <button
      onClick={handleClick}
      className={[
        full || variant==='bar' ? 'rounded-lg' : 'rounded-md',
        'relative border text-left transition hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-black/10',
        dashed ? 'border-dashed' : '',
        base,
        full ? 'w-full h-full' : 'min-h-[54px]'
      ].join(' ')}
      style={style as any}
      title={p.name}
      aria-label={`Abrir ${p.name||'proyecto'}`}
    >
      {/* TÍTULO (arriba). En 2x2 mostramos iniciales; en el resto el nombre */}
      {variant==='bar' ? (
        <TitleSmall text={p.name||'Sin título'} className="text-[10px] leading-tight font-medium pr-4" />
      ) : compact ? (
        <div className="font-semibold tracking-wide text-[10px]">{initials(p.name)}</div>
      ) : (
        <div className="text-[11px] leading-tight font-medium truncate pr-5">{p.name||'Sin título'}</div>
      )}

      {/* BURBUJA DE FASE: SIEMPRE CENTRADA Y SIN SOLAPES CON TÍTULO */}
      <span
        className={[
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'inline-flex items-center justify-center rounded-full border bg-white/80 shadow-sm',
          compact ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-[11px]',
          dashed ? 'border-red-400 text-red-700' : 'border-black/20 text-black/70',
        ].join(' ')}
      >
        {phase ?? ''}
      </span>
    </button>
  )
}
