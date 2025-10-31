// src/components/ProjectForm.tsx
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/repo'
import { createProject, updateProject } from '@/lib/repo'

type Props = {
  editing?: Project | null
  onClose: () => void
  onSaved: (id?: string) => void
}

function iso(d?: string | Date | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  // YYYY-MM-DD
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

export default function ProjectForm({ editing, onClose, onSaved }: Props) {
  // Campos de negocio
  const [name, setName] = useState(editing?.name ?? '')
  const [producer, setProducer] = useState(editing?.producer ?? '')
  const [contact, setContact] = useState(editing?.contact ?? '')
  const [city, setCity] = useState(editing?.city ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')

  // Presupuestos (€)
  const [budget, setBudget] = useState<string>(editing?.budget != null ? String(editing.budget) : '')
  const [teamBudget, setTeamBudget] = useState<string>(editing?.teamBudget != null ? String(editing.teamBudget) : '')

  // Confirmación (Pendiente vs Confirmado)
  const [confirmed, setConfirmed] = useState<boolean>(editing?.confirmed ?? true)

  // Fechas mínimas necesarias (Rodaje) — Fitting/Prep en Paso 3
  const [rodajeStart, setRodajeStart] = useState<string>(iso(editing?.rodajeStart) || '')
  const [rodajeEnd, setRodajeEnd] = useState<string>(iso(editing?.rodajeEnd) || '')

  const [saving, setSaving] = useState(false)

  const canSave = useMemo(() => {
    if (!name.trim()) return false
    if (!rodajeStart || !rodajeEnd) return false
    if (rodajeStart > rodajeEnd) return false
    return true
  }, [name, rodajeStart, rodajeEnd])

  async function handleSave() {
    if (!canSave) {
      alert('Revisa: nombre y fechas de rodaje (inicio/fin).')
      return
    }
    setSaving(true)
    try {
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
        // Fechas mínimas para DB
        rodajeStart,
        rodajeEnd,
        // Fases que añadiremos/ajustaremos en Paso 3:
        fittingStart: editing?.fittingStart ?? null,
        fittingEnd: editing?.fittingEnd ?? null,
        prepStart: editing?.prepStart ?? null,
        prepEnd: editing?.prepEnd ?? null,
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

          <div className="space-y-4">
            {/* Confirmado / Pendiente */}
            <div className="section-card p-4">
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

            {/* Datos principales */}
            <div className="section-card p-4">
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
            <div className="section-card p-4">
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

            {/* Fechas mínimas (Rodaje) */}
            <div className="section-card p-4">
              <div className="text-xs uppercase text-gray-500 mb-2">Fechas de Rodaje</div>
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
