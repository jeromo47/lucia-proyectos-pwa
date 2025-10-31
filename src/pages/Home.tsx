// src/pages/Home.tsx
import HeaderBar from '@/components/HeaderBar'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, isBefore, parseISO } from 'date-fns'
import { getProjects, type Project, getDurationRange } from '@/lib/repo'

type TabKey = 'current' | 'upcoming' | 'past' | 'pending'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'current', label: 'Actuales' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'past', label: 'Pasados' },
  { key: 'pending', label: 'Pendientes' },
]

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function getStartEnd(p: Project) {
  const { start, end } = getDurationRange(p)
  return {
    start: parseISO(start), // prepStart ?? rodajeStart
    end: parseISO(end),     // rodajeEnd
  }
}

function inCurrent(p: Project, now: Date) {
  const { start, end } = getStartEnd(p)
  return !isBefore(now, start) && !isAfter(now, end) // start <= now <= end
}

function isUpcoming(p: Project, now: Date) {
  const { start } = getStartEnd(p)
  return isAfter(start, now) // start > now
}

function isPast(p: Project, now: Date) {
  const { end } = getStartEnd(p)
  return isBefore(end, now) // end < now
}

export default function Home() {
  const [active, setActive] = useState<TabKey>('current')
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await getProjects()
        if (!mounted) return
        setItems(data)
      } catch (e: any) {
        setError(e?.message ?? 'Error cargando proyectos')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const now = useMemo(() => parseISO(todayISO()), [])

  const filtered = useMemo(() => {
    if (error) return []
    switch (active) {
      case 'pending':
        // Solo no confirmados (sin mezclar con las otras listas)
        return items.filter(p => p.confirmed === false)
      case 'current':
        return items.filter(p => p.confirmed && inCurrent(p, now))
      case 'upcoming':
        return items.filter(p => p.confirmed && isUpcoming(p, now))
      case 'past':
        return items.filter(p => p.confirmed && isPast(p, now))
      default:
        return items
    }
  }, [active, items, now, error])

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-4 md:p-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => {
            const selected = active === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`px-3 py-2 rounded-lg border text-sm ${selected ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Estado */}
        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {/* Lista */}
        {!loading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500">No hay proyectos en “{TABS.find(t => t.key === active)?.label}”.</div>
            )}

            {filtered.map(p => {
              const range = getDurationRange(p)
              return (
                <Link
                  key={p.id}
                  to={`/project/${p.id}`}
                  className="block border rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.name || 'Sin nombre'}</div>
                    <div className={`text-xs ${p.confirmed ? 'text-gray-500' : 'text-red-600'}`}>
                      {p.confirmed ? 'Confirmado' : 'Pendiente'}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {p.city ? `${p.city} • ` : ''}
                    {range.start} → {range.end}
                  </div>

                  {(p.producer || p.contact) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {p.producer ? `Prod: ${p.producer}` : ''} {p.contact ? `• ${p.contact}` : ''}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
