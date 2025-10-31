// src/components/ProjectForm.tsx
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/repo'
import { createProject, updateProject, getProjects } from '@/lib/repo'

// Helpers de fecha (YYYY-MM-DD) sin zona
function toISODate(d: Date) {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  return utc.toISOString().slice(0, 10)
}
function parseISODate(s?: string | null) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function addDays(iso: string, days: number) {
  const d = parseISODate(iso)!
  d.setDate(d.getDate() + days)
  return toISODate(d)
}
function isAfterOrEqual(a: string, b: string) {
  return a >= b
}
function isBeforeOrEqual(a: string, b: string) {
  return a <= b
}
function rangeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return !(aEnd < bStart || bEnd < aStart) // solapan si no están completamente separados
}

type Props = {
  editing?: Project | null
  onClose: () => void
  onSaved: (id?: string) => void
}

export default function ProjectForm({ editing, onClose, onSaved }: Props) {
  // Campos de negocio
  const [name, setName] = useState(editing?.name ?? '')
  const [producer, setProducer] = useState(editing?.producer ?? '')
  const [contact, setContact] = useState(editing?.contact ?? '')
  const [city, setCity] = useState(editing?.city ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [budget, setBudget] = useState<string>(editing?.budget != null ? String(editing.budget) : '')
  const [teamBudget, setTeamBudget] = useState<string>(editing?.teamBudget != null ? String(editing.teamBudget) : '')
  const [confirmed, setConfirmed] = useState<boolean>(editing?.confirmed ?? true)

  // Fechas de Rodaje (obligatorias)
  const [rodajeStart, setRodajeStart] = useState<string>(editing?.rodajeStart ?? '')
  const [rodajeEnd, setRodajeEnd] = useState<string>(editing?.rodajeEnd ?? '')

  // Fitting (por defecto: 2 días antes del inicio de rodaje, 1 día)
  const [fittingStart, setFittingStart] = useState<string>(editing?.fittingStart ?? '')
  const [fittingEnd, setFittingEnd] = useState<string>(editing?.fittingEnd ?? '')

  // Preparación (por defecto: 6 días antes de FittingStart, 6 días)
  const [prepStart, setPrepStart] = useState<string>(editing?.prepStart ?? '')
  const [prepEnd, setPrepEnd] = useState<string>(editing?.prepEnd ?? '')

  const [saving, setSaving] = useState(false)
  const [warnOverlap, setWarnOverlap] = useState<string | null>(null)

  // Autocálculo inicial/ reactivo
  // - Al introducir RodajeStart por primera vez o cambiarlo, si no hay valores manuales previos:
  //   fittingStart = rodajeStart - 2 días; fittingEnd = fittingStart
  // - Al introducir/cambiar FittingStart, si no hubo edición manual de Prep:
  //   prepStart = fittingStart - 6 días; prepEnd = fittingStart - 1 día (6 días de duración)
  useEffect(() => {
    if (!rodajeStart) return
    // Autocalcula fitting si está vacío
    if (!fittingStart) {
      const fs = addDays(rodajeStart, -2)
      setFittingStart(fs)
      setFittingEnd(fs)
    }
  }, [rodajeStart]) // eslint-disable-line

  useEffect(() => {
    if (!fittingStart) return
    // Autocalcula preparación si está vacía
    if (!prepStart || !prepEnd) {
      const ps = addDays(fittingStart, -6)
      const pe = addDays(fittingStart, -1) // 6 días hasta la víspera del fitting
      setPrepStart(ps)
      setPrepEnd(pe)
    }
  }, [fittingStart]) // eslint-disable-line

  const durationStart = useMemo(() => {
    return prepStart || rodajeStart || ''
  }, [prepStart, rodajeStart])

  const durationEnd = useMemo(() => rodajeEnd || '', [rodajeEnd])

  const canSave = useMemo(() => {
    if (!name.trim()) return false
    if (!rodajeStart || !rodajeEnd) return false
    if (rodajeStart > rodajeEnd) return false
    // Si hay fitting: asegurar orden (opcional, no bloquea si usuario borra fitting)
    if (fittingStart && !isBeforeOrEqual(fittingStart, rodajeStart)) return false
    if (fittingStart && fittingEnd && !isBeforeOrEqual(fittingStart, fittingEnd)) return false
    // Si hay preparación: asegurar orden previa al fitting
    if (prepStart && fittingStart && !isBeforeOrEqual(prepStart, fittingStart)) return false
    if (prepStart && prepEnd && !isBeforeOrEqual(prepStart, prepEnd)) return false
    if (prepEnd && fittingStart && !isBeforeOrEqual(prepEnd, fittingStart)) return false
    return true
  }, [name, rodajeStart, rodajeEnd, fittingStart, fittingEnd, prepStart, prepEnd])

  async function checkOverlaps(proposed: {
    id?: string
    confirmed: boolean
    name: string
    prep?: [string, string] | null
    fitting?: [string, string] | null
    rodaje: [string, string]
  }) {
    if (!proposed.confirmed) return null // Solo avisamos si el proyecto va a estar confirmado
    const others = await getProjects()
    const conflicts: string[] = []

    for (const o of others) {
      if (proposed.id && o.id === proposed.id) continue
      if (!o.confirmed) continue

      const oPrep = o.prepStart && o.prepEnd ? [o.prepStart, o.prepEnd] as [string, string] : null
      const oFitting = o.fittingStart && o.fittingEnd ? [o.fittingStart, o.fittingEnd] as [string, string] : null
      const oRodaje = [o.rodajeStart, o.rodajeEnd] as [string, string]

      // Fase a fase, si tenemos ambas bandas
      if (proposed.prep && oPrep && rangeOverlap(proposed.prep[0], proposed.prep[1], oPrep[0], oPrep[1])) {
        conflicts.push(`Solape de Preparación con "${o.name}" (${proposed.prep[0]}–${proposed.prep[1]} vs ${oPrep[0]}–${oPrep[1]})`)
      }
      if (proposed.fitting && oFitting && rangeOverlap(proposed.fitting[0], proposed.fitting[1], oFitting[0], oFitting[1])) {
        conflicts.push(`Solape de Fitting con "${o.name}" (${proposed.fitting[0]}–${proposed.fitting[1]} vs ${oFitting[0]}–${oFitting[1]})`)
      }
      // Siempre comprobamos rodaje
      if (rangeOverlap(proposed.rodaje[0], proposed.rodaje[1], oRodaje[0], oRodaje[1])) {
        conflicts.push(`Solape de Rodaje con "${o.name}" (${proposed.rodaje[0]}–${proposed.rodaje[1]} vs ${oRodaje[0]}–${oRodaje[1]})`)
      }

      // Si no había datos de fases en el otro proyecto, al menos avisamos por el rango total
      const pTotalStart = proposed.prep?.[0] ?? proposed.rodaje[0]
      const pTotalEnd = proposed.rodaje[1]
      const oTotalStart = o.prepStart ?? o.rodajeStart
      const oTotalEnd = o.rodajeEnd
      if (rangeOverlap(pTotalStart, pTotalEnd, oTotalStart, oTotalEnd)) {
        // Evita duplicar si ya hubo conflictos de fases/rodaje
        // (hecho simple: solo añade si no hay aún conflictos para ese otro proyecto)
        // Aquí lo mantenemos simple para no sobrecomplicar
      }
    }

    if (conflicts.length) {
      return conflicts.join('\n')
    }
    return null
  }

  async function handleSave() {
    if (!canSave) {
      alert('Revisa los campos: nombre y fechas (el orden debe ser correcto).')
      return
    }

    // Prepara payload
    const payload = {
      confirmed,
      name: name.trim(),
      producer: producer.trim(),
      contact: contact.trim(),
      city: city.trim(),
      description: description.trim(),
      notes: notes.trim(),
      budget: budget === '' ? null : Number(budget),
      teamBudget: teamBudget === '' ? null : Number(teamBudget),
      // Fechas
      rodajeStart,
      rodajeEnd,
      fittingStart: fittingStart || null,
      fittingEnd: fittingEnd || fittingStart || null, // si hay fittingStart pero no end, lo igualamos
      prepStart: prepStart || null,
      prepEnd: prepEnd || null,
    }

    // Chequeo de solapes (solo si confirmado)
    setSaving(true)
    try {
      const overlapMsg = await checkOverlaps({
        id: editing?.id,
        confirmed: payload.confirmed,
        name: payload.name,
        prep: payload.prepStart && payload.prepEnd ? [payload.prepStart, payload.prepEnd] : null,
        fitting: payload.fittingStart && payload.fittingEnd ? [payload.fittingStart, payload.fittingEnd] : null,
        rodaje: [payload.rodajeStart, payload.rodajeEnd],
      })

      if (overlapMsg) {
        setWarnOverlap(overlapMsg)
        const proceed = confirm(`${overlapMsg}\n\n¿Deseas guardar igualmente?`)
        if (!proceed) {
          setSaving(false)
          return
        }
      }

      if (editing?.id) {
        const updated = await updateProject(editing.id, payload)
        onSaved(updated.id)
      } else {
        const created = await createProject(payload as any)
        onSaved(created.id)
      }
    } catch (e: any) {
      console.error(e)
      alert(e?.message ?? 'Error al guardar el proyecto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 text-lg"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-center">
            {editing ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>

          {/* Confirmado / Pendiente */}
          <div className="section-card p-4 mb-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                <span className="font-medium">Confirmado</span>{' '}
                <span className="text-gray-500">(desmarca para dejarlo en “Pendientes”)</span>
              </span>
            </label>
          </div>

          {/* Datos de negocio */}
          <div className="section-card p-4 mb-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Información del proyecto</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Nombre del proyecto
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre…"
                />
              </label>

              <label className="text-sm block">
                Productora
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  placeholder="Producer S.L."
                />
              </label>

              <label className="text-sm block">
                Contacto
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="email / teléfono"
                />
              </label>

              <label className="text-sm block">
                Ciudad
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Madrid"
                />
              </label>
            </div>

            <label className="text-sm block mt-3">
              Descripción
              <textarea
                className="w-full border rounded-lg px-3 py-2 mt-1 resize-y"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción breve…"
              />
            </label>

            <label className="text-sm block mt-3">
              Notas
              <textarea
                className="w-full border rounded-lg px-3 py-2 mt-1 resize-y"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas…"
              />
            </label>
          </div>

          {/* Presupuestos */}
          <div className="section-card p-4 mb-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Presupuestos</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Presupuesto (€)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="text-sm block">
                Presupuesto equipo (€)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={teamBudget}
                  onChange={(e) => setTeamBudget(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
          </div>

          {/* Fechas: Rodaje */}
          <div className="section-card p-4 mb-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Rodaje</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Inicio
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={rodajeStart}
                  onChange={(e) => setRodajeStart(e.target.value)}
                />
              </label>

              <label className="text-sm block">
                Fin
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={rodajeEnd}
                  min={rodajeStart || undefined}
                  onChange={(e) => setRodajeEnd(e.target.value)}
                />
              </label>
            </div>
            {rodajeStart && rodajeEnd && rodajeStart > rodajeEnd && (
              <div className="text-red-600 text-sm mt-2">La fecha fin debe ser ≥ inicio.</div>
            )}
          </div>

          {/* Fechas: Fitting (editable) */}
          <div className="section-card p-4 mb-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Fitting</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Inicio (por defecto: 2 días antes de rodaje)
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={fittingStart}
                  onChange={(e) => {
                    setFittingStart(e.target.value)
                    if (!fittingEnd) setFittingEnd(e.target.value)
                  }}
                />
              </label>

              <label className="text-sm block">
                Fin (1 día; puedes ajustar)
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={fittingEnd}
                  min={fittingStart || undefined}
                  onChange={(e) => setFittingEnd(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Fechas: Preparación (editable) */}
          <div className="section-card p-4 mb-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Preparación</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Inicio (por defecto: 6 días antes de Fitting)
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={prepStart}
                  onChange={(e) => setPrepStart(e.target.value)}
                />
              </label>

              <label className="text-sm block">
                Fin (por defecto: víspera del Fitting)
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={prepEnd}
                  min={prepStart || undefined}
                  onChange={(e) => setPrepEnd(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Duración total (no editable) */}
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Duración total (calculada)</div>
            <div className="text-sm">
              {durationStart && durationEnd
                ? `${durationStart} → ${durationEnd}`
                : '—'}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full mt-6 bg-black text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear proyecto')}
          </button>
        </div>
      </div>
    </div>
  )
}
