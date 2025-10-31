// src/components/ProjectForm.tsx
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/repo'
import { createProject, updateProject, getProjects } from '@/lib/repo'

// --- Helpers de fecha seguros (solo aceptan YYYY-MM-DD) ---
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function safeParseISO(s?: string | null): Date | null {
  if (!s || !DATE_RX.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  // Validaciones mínimas
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  // Normaliza a fecha "pura" sin huso
  const z = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return z.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string | null {
  const base = safeParseISO(iso);
  if (!base) return null;
  base.setDate(base.getDate() + days);
  return toISO(base);
}
function rangeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return !(aEnd < bStart || bEnd < aStart);
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

  // Fechas
  const [rodajeStart, setRodajeStart] = useState<string>(editing?.rodajeStart ?? '')
  const [rodajeEnd, setRodajeEnd] = useState<string>(editing?.rodajeEnd ?? '')
  const [fittingStart, setFittingStart] = useState<string>(editing?.fittingStart ?? '')
  const [fittingEnd, setFittingEnd] = useState<string>(editing?.fittingEnd ?? '')
  const [prepStart, setPrepStart] = useState<string>(editing?.prepStart ?? '')
  const [prepEnd, setPrepEnd] = useState<string>(editing?.prepEnd ?? '')

  const [saving, setSaving] = useState(false)

  // ----- Autocálculos SOLO si el formato es válido -----
  useEffect(() => {
    if (!DATE_RX.test(rodajeStart)) return;
    if (!fittingStart) {
      const fs = addDays(rodajeStart, -2);
      if (fs) {
        setFittingStart(fs);
        if (!fittingEnd) setFittingEnd(fs);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodajeStart])

  useEffect(() => {
    if (!DATE_RX.test(fittingStart)) return;
    if (!prepStart || !prepEnd) {
      const ps = addDays(fittingStart, -6);
      const pe = addDays(fittingStart, -1);
      if (ps) setPrepStart(ps);
      if (pe) setPrepEnd(pe);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fittingStart])

  const durationStart = useMemo(() => {
    return prepStart && DATE_RX.test(prepStart) ? prepStart : (rodajeStart || '');
  }, [prepStart, rodajeStart])

  const durationEnd = useMemo(() => rodajeEnd || '', [rodajeEnd])

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!DATE_RX.test(rodajeStart) || !DATE_RX.test(rodajeEnd)) return false;
    if (rodajeStart > rodajeEnd) return false;

    // Validaciones suaves de orden
    if (fittingStart && !DATE_RX.test(fittingStart)) return false;
    if (fittingEnd && !DATE_RX.test(fittingEnd)) return false;
    if (prepStart && !DATE_RX.test(prepStart)) return false;
    if (prepEnd && !DATE_RX.test(prepEnd)) return false;

    if (fittingStart && rodajeStart && !(fittingStart <= rodajeStart)) return false;
    if (fittingStart && fittingEnd && !(fittingStart <= fittingEnd)) return false;
    if (prepStart && fittingStart && !(prepStart <= fittingStart)) return false;
    if (prepStart && prepEnd && !(prepStart <= prepEnd)) return false;
    if (prepEnd && fittingStart && !(prepEnd <= fittingStart)) return false;
    return true;
  }, [name, rodajeStart, rodajeEnd, fittingStart, fittingEnd, prepStart, prepEnd])

  async function checkOverlaps(proposed: {
    id?: string
    confirmed: boolean
    name: string
    prep?: [string, string] | null
    fitting?: [string, string] | null
    rodaje: [string, string]
  }) {
    if (!proposed.confirmed) return null;
    const others = await getProjects();
    const conflicts: string[] = [];

    for (const o of others) {
      if (proposed.id && o.id === proposed.id) continue;
      if (!o.confirmed) continue;

      const oPrep = (o.prepStart && o.prepEnd) ? [o.prepStart, o.prepEnd] as [string, string] : null;
      const oFitting = (o.fittingStart && o.fittingEnd) ? [o.fittingStart, o.fittingEnd] as [string, string] : null;
      const oRodaje = [o.rodajeStart, o.rodajeEnd] as [string, string];

      if (proposed.prep && oPrep && rangeOverlap(proposed.prep[0], proposed.prep[1], oPrep[0], oPrep[1])) {
        conflicts.push(`Solape de Preparación con "${o.name}" (${proposed.prep[0]}–${proposed.prep[1]} vs ${oPrep[0]}–${oPrep[1]})`);
      }
      if (proposed.fitting && oFitting && rangeOverlap(proposed.fitting[0], proposed.fitting[1], oFitting[0], oFitting[1])) {
        conflicts.push(`Solape de Fitting con "${o.name}" (${proposed.fitting[0]}–${proposed.fitting[1]} vs ${oFitting[0]}–${oFitting[1]})`);
      }
      if (rangeOverlap(proposed.rodaje[0], proposed.rodaje[1], oRodaje[0], oRodaje[1])) {
        conflicts.push(`Solape de Rodaje con "${o.name}" (${proposed.rodaje[0]}–${proposed.rodaje[1]} vs ${oRodaje[0]}–${oRodaje[1]})`);
      }
    }

    return conflicts.length ? conflicts.join('\n') : null;
  }

  async function handleSave() {
    if (!canSave) {
      alert('Revisa los campos: formato de fechas (YYYY-MM-DD) y orden lógico.');
      return;
    }

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
      rodajeStart,
      rodajeEnd,
      fittingStart: fittingStart || null,
      fittingEnd: fittingEnd || fittingStart || null,
      prepStart: prepStart || null,
      prepEnd: prepEnd || null,
    }

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
        const proceed = confirm(`${overlapMsg}\n\n¿Deseas guardar igualmente?`);
        if (!proceed) { setSaving(false); return; }
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
    // overlay con scroll
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* contenedor con altura máxima y scroll interno */}
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 text-lg"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-center">
            {editing ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
        </div>

        {/* área scrolleable */}
        <div className="p-6 space-y-4 overflow-y-auto">
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

          {/* Datos de negocio */}
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

          {/* Rodaje */}
          <div className="section-card p-4">
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

          {/* Fitting */}
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Fitting</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm block">
                Inicio (por defecto: 2 días antes de rodaje)
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={fittingStart}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFittingStart(v);
                    if (!fittingEnd && DATE_RX.test(v)) setFittingEnd(v);
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

          {/* Preparación */}
          <div className="section-card p-4">
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

          {/* Duración total */}
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Duración total (calculada)</div>
            <div className="text-sm">
              {durationStart && durationEnd ? `${durationStart} → ${durationEnd}` : '—'}
            </div>
          </div>
        </div>

        {/* footer fijo con botón */}
        <div className="p-6 border-t">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full bg-black text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear proyecto')}
          </button>
        </div>
      </div>
    </div>
  )
}
