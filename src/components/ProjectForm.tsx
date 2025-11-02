// src/components/ProjectForm.tsx
import { useEffect, useMemo, useState } from 'react'
import RodajeRange from '@/components/RodajeRange'
import { addDaysISO, clampISO } from '@/lib/date'
import { upsertProject, type Project } from '@/lib/repo'

type Props = {
  project?: Project | null
  onCancel?: () => void
  onSaved?: (p: Project) => void
}

const FITTING_OFFSET_DAYS = -2       // Fitting: 2 días antes del inicio de rodaje
const FITTING_LENGTH_DAYS = 1        // Dura 1 día (mismo día)
const PREP_OFFSET_FROM_FITTING = -6  // Preparación: 6 días antes del fittingStart
const PREP_LENGTH_DAYS = 6           // 6 días (prepEnd = prepStart + 5)

export default function ProjectForm({ project, onCancel, onSaved }: Props) {
  // === Campos básicos ===
  const [name, setName]                 = useState(project?.name ?? '')
  const [producer, setProducer]         = useState(project?.producer ?? '')
  const [contact, setContact]           = useState(project?.contact ?? '')
  const [city, setCity]                 = useState(project?.city ?? '')
  const [description, setDescription]   = useState(project?.description ?? '')
  const [notes, setNotes]               = useState(project?.notes ?? '')
  const [budget, setBudget]             = useState<number | ''>(project?.budget ?? '')
  const [budgetTeam, setBudgetTeam]     = useState<number | ''>(project?.budgetTeam ?? '')
  const [confirmed, setConfirmed]       = useState<boolean>(project?.confirmed ?? false)

  // === Fechas (ISO YYYY-MM-DD en UTC) ===
  const [rodajeStart, setRodajeStart]   = useState<string>(project?.rodajeStart ?? '')
  const [rodajeEnd, setRodajeEnd]       = useState<string>(project?.rodajeEnd ?? '')

  const [fittingStart, setFittingStart] = useState<string>(project?.fittingStart ?? '')
  const [fittingEnd, setFittingEnd]     = useState<string>(project?.fittingEnd ?? '')

  const [prepStart, setPrepStart]       = useState<string>(project?.prepStart ?? '')
  const [prepEnd, setPrepEnd]           = useState<string>(project?.prepEnd ?? '')

  // === Flags: si el usuario toca Fitting/Preparación, respetamos su edición ===
  const [touchedFitting, setTouchedFitting] = useState<boolean>(false)
  const [touchedPrep, setTouchedPrep]       = useState<boolean>(false)

  // === UI estado ===
  const [showRodajeRange, setShowRodajeRange] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Helper: autocalcular si no ha sido tocado por el usuario
  function autoOrKeep(current: string | null | undefined, next: string, touched: boolean) {
    return touched && current ? current : next
  }

  // Cálculo derivado coherente en UTC
  function recalcFromRodaje(newRodajeStart: string, newRodajeEnd: string) {
    if (!newRodajeStart) return

    const fitStartNext = addDaysISO(newRodajeStart, FITTING_OFFSET_DAYS)
    const fitEndNext   = addDaysISO(fitStartNext, FITTING_LENGTH_DAYS - 1) // mismo día

    const prepStartNext = addDaysISO(fitStartNext, PREP_OFFSET_FROM_FITTING)
    const prepEndNext   = addDaysISO(prepStartNext, PREP_LENGTH_DAYS - 1)  // +5

    setFittingStart(prev => autoOrKeep(prev, fitStartNext, touchedFitting))
    setFittingEnd(prev   => autoOrKeep(prev, fitEndNext,   touchedFitting))

    setPrepStart(prev    => autoOrKeep(prev, prepStartNext, touchedPrep))
    setPrepEnd(prev      => autoOrKeep(prev, prepEndNext,   touchedPrep))
  }

  // Si venimos con un proyecto cargado y faltan derivados, rellenar una vez
  useEffect(() => {
    if (rodajeStart) {
      recalcFromRodaje(rodajeStart, rodajeEnd || rodajeStart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handlers manuales (si el usuario edita fitting/prep)
  const onFittingStartChange = (v: string) => { setTouchedFitting(true); setFittingStart(clampISO(v)) }
  const onFittingEndChange   = (v: string) => { setTouchedFitting(true); setFittingEnd(clampISO(v)) }
  const onPrepStartChange    = (v: string) => { setTouchedPrep(true);    setPrepStart(clampISO(v)) }
  const onPrepEndChange      = (v: string) => { setTouchedPrep(true);    setPrepEnd(clampISO(v)) }

  // Mostrar rango de rodaje para el botón
  const rodajeLabel = useMemo(() => {
    if (rodajeStart && rodajeEnd) return `Del ${formatDDMM(rodajeStart)} al ${formatDDMM(rodajeEnd)}`
    if (rodajeStart) return `Desde ${formatDDMM(rodajeStart)}`
    return 'Elegir fechas de rodaje'
  }, [rodajeStart, rodajeEnd])

  // === GUARDAR ===
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('El nombre del proyecto es obligatorio'); return }
    if (!rodajeStart || !rodajeEnd) { setError('Selecciona el rango de Rodaje'); return }

    const payload: Project = {
      id: project?.id ?? undefined,
      name: name.trim(),
      producer: producer.trim(),
      contact: contact.trim(),
      city: city.trim(),
      description: description.trim(),
      notes: notes.trim(),
      budget: typeof budget === 'number' ? budget : (budget ? Number(budget) : 0),
      budgetTeam: typeof budgetTeam === 'number' ? budgetTeam : (budgetTeam ? Number(budgetTeam) : 0),
      confirmed,
      rodajeStart, rodajeEnd,
      fittingStart: fittingStart || null,
      fittingEnd: fittingEnd || null,
      prepStart: prepStart || null,
      prepEnd: prepEnd || null,
    }

    try {
      setSaving(true)
      const saved = await upsertProject(payload)
      setSaving(false)
      onSaved?.(saved)
    } catch (err: any) {
      setSaving(false)
      setError(err?.message ?? 'No se pudo guardar el proyecto')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* ======= Identidad del proyecto ======= */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Nombre del proyecto</label>
          <input type="text" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={name} onChange={e => setName(e.target.value)} placeholder="Proyecto" />
        </div>
        <div>
          <label className="text-sm font-medium">Productora</label>
          <input type="text" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={producer} onChange={e => setProducer(e.target.value)} placeholder="Nombre de la productora" />
        </div>
        <div>
          <label className="text-sm font-medium">Contacto</label>
          <input type="text" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={contact} onChange={e => setContact(e.target.value)} placeholder="Persona de contacto" />
        </div>
        <div>
          <label className="text-sm font-medium">Ciudad</label>
          <input type="text" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={city} onChange={e => setCity(e.target.value)} placeholder="Madrid, Barcelona…" />
        </div>
      </div>

      {/* ======= Fechas ======= */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Rodaje (rango en un paso) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rodaje</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowRodajeRange(true)}
                    className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
              {rodajeLabel}
            </button>
            {(rodajeStart || rodajeEnd) && (
              <button type="button" onClick={() => { setRodajeStart(''); setRodajeEnd('') }}
                      className="px-2.5 py-1.5 rounded-lg border text-xs text-gray-600 hover:bg-gray-50">
                Limpiar
              </button>
            )}
          </div>

          <RodajeRange
            open={showRodajeRange}
            initialStart={rodajeStart || null}
            initialEnd={rodajeEnd || null}
            onCancel={() => setShowRodajeRange(false)}
            onConfirm={(startISO, endISO) => {
              const s = clampISO(startISO)
              const e = clampISO(endISO)
              setRodajeStart(s)
              setRodajeEnd(e)
              recalcFromRodaje(s, e)
              setShowRodajeRange(false)
            }}
          />
        </div>

        {/* Confirmado / Pendiente */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado</label>
          <div className="flex items-center gap-2">
            <input id="confirmed" type="checkbox" checked={confirmed}
                   onChange={e => setConfirmed(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="confirmed" className="text-sm">
              Confirmado (si lo desmarcas, se mostrará en <b>Pendientes</b>)
            </label>
          </div>
        </div>
      </div>

      {/* Fitting / Preparación */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Fitting (inicio)</label>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2"
                   value={fittingStart || ''} onChange={e => onFittingStartChange(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Fitting (fin)</label>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2"
                   value={fittingEnd || ''} onChange={e => onFittingEndChange(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Preparación (inicio)</label>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2"
                   value={prepStart || ''} onChange={e => onPrepStartChange(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Preparación (fin)</label>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2"
                   value={prepEnd || ''} onChange={e => onPrepEndChange(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Presupuestos */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Presupuesto (€)</label>
          <input inputMode="decimal" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={budget} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                 placeholder="0" />
        </div>
        <div>
          <label className="text-sm font-medium">Presupuesto equipo (€)</label>
          <input inputMode="decimal" className="mt-1 w-full rounded-lg border px-3 py-2"
                 value={budgetTeam} onChange={e => setBudgetTeam(e.target.value === '' ? '' : Number(e.target.value))}
                 placeholder="0" />
        </div>
      </div>

      {/* Descripción / Notas */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Descripción</label>
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2 min-h-[80px]"
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Breve descripción del proyecto" />
        </div>
        <div>
          <label className="text-sm font-medium">Notas</label>
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2 min-h-[80px]"
                    value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas" />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancelar</button>
        <button type="submit" disabled={saving}
                className={`px-3 py-2 rounded-lg border text-sm ${saving ? 'opacity-50 cursor-wait' : 'bg-black text-white hover:bg-black/90'}`}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function formatDDMM(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(dt)
}
