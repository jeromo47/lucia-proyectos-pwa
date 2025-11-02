// src/components/RodajeRange.tsx
import { useEffect, useMemo, useState } from 'react'
import { DayPicker, DateRange, getDefaultClassNames } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { toISO } from '@/lib/date'

type Props = {
  open: boolean
  initialStart?: string | null
  initialEnd?: string | null
  onCancel: () => void
  onConfirm: (startISO: string, endISO: string) => void
}

export default function RodajeRange({ open, initialStart, initialEnd, onCancel, onConfirm }: Props) {
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    const start = initialStart ? isoToDate(initialStart) : undefined
    const end   = initialEnd   ? isoToDate(initialEnd)   : undefined
    if (start && end) setRange({ from: start, to: end })
    else setRange(undefined)
  }, [open, initialStart, initialEnd])

  const disabled = !range?.from || !range?.to

  const classes = useMemo(() => {
    const base = getDefaultClassNames()
    return {
      ...base,
      caption_label: base.caption_label + ' capitalize',
      day: base.day + ' hover:bg-black/5 focus-visible:outline-none',
      selected: base.selected + ' !bg-black !text-white',
    }
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-[360px] rounded-2xl bg-white shadow-xl border">
        <div className="p-3 border-b">
          <div className="text-sm font-medium">Selecciona las fechas de Rodaje</div>
          <div className="text-xs text-gray-500">Un solo paso: inicio y fin</div>
        </div>
        <div className="p-3">
          <DayPicker
            mode="range"
            ISOWeek
            showOutsideDays
            numberOfMonths={1}
            selected={range}
            onSelect={setRange}
            classNames={classes}
          />
        </div>
        <div className="p-3 flex items-center justify-end gap-2 border-t">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">
            Cancelar
          </button>
          <button
            disabled={disabled}
            onClick={() => {
              if (!range?.from || !range?.to) return
              onConfirm(toISO(range.from), toISO(range.to))
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border ${disabled ? 'opacity-40 cursor-not-allowed' : 'bg-black text-white hover:bg-black/90'}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}
