import React, { useState, useEffect } from 'react';
import { fmt, parseDate } from '@/lib/date';
import { db } from '@/lib/db';
import type { Project } from '@/lib/types';

interface Props {
  editing?: Project;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProjectForm({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title || '');
  const [desc, setDesc] = useState(editing?.desc || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [start, setStart] = useState(editing ? fmt(editing.startDate, 'yyyy-MM-dd') : '');
  const [end, setEnd] = useState(editing ? fmt(editing.endDate, 'yyyy-MM-dd') : '');
  const [contractBudget, setContractBudget] = useState(editing?.contractBudget || '');
  const [finalBudget, setFinalBudget] = useState(editing?.finalBudget || '');
  const [overlapWarn, setOverlapWarn] = useState<Project | null>(null);

  // --- Detectar solapes de fechas ---
  useEffect(() => {
    async function checkOverlap() {
      if (!start || !end) return setOverlapWarn(null);
      const all = await db.projects.toArray();
      const s = parseDate(start);
      const e = parseDate(end);

      const overlap = all.find(
        p =>
          p.id !== editing?.id &&
          ((s >= p.startDate && s <= p.endDate) ||
            (e >= p.startDate && e <= p.endDate) ||
            (s <= p.startDate && e >= p.endDate))
      );
      setOverlapWarn(overlap || null);
    }
    checkOverlap();
  }, [start, end, editing]);

  // --- Guardar proyecto ---
  const handleSave = async () => {
    if (!title.trim()) return alert('El nombre es obligatorio');
    if (start > end) return alert('La fecha fin debe ser mayor o igual que la de inicio');
    const project: Project = {
      id: editing?.id || crypto.randomUUID(),
      title: title.trim(),
      desc: desc.trim(),
      notes: notes.trim(),
      startDate: parseDate(start),
      endDate: parseDate(end),
      contractBudget: Number(contractBudget) || undefined,
      finalBudget: Number(finalBudget) || undefined,
      createdAt: editing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    await db.projects.put(project);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-2xl p-6 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 text-lg"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-center">
          {editing ? 'Editar proyecto' : 'Nuevo proyecto'}
        </h2>

        {/* Nombre, descripción y notas */}
        <div className="space-y-4">
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Proyecto</div>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-2"
              placeholder="Nombre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 mb-2 resize-none"
              placeholder="Descripción"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 resize-none"
              placeholder="Notas"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Fechas */}
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Fechas</div>

            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm block">
                Inicio
                <input
                  type="date"
                  className="w-full mt-1 border rounded-lg px-3 py-2.5 bg-white appearance-none"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>

              <label className="text-sm block">
                Fin
                <input
                  type="date"
                  className="w-full mt-1 border rounded-lg px-3 py-2.5 bg-white appearance-none"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>

            {start > end && (
              <div className="text-red-600 text-sm mt-2">
                La fecha fin debe ser ≥ inicio.
              </div>
            )}

            {overlapWarn && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm px-3 py-2">
                Solape con “{overlapWarn.title}”
                {' '}({fmt(overlapWarn.startDate)} — {fmt(overlapWarn.endDate)}).
              </div>
            )}
          </div>

          {/* Presupuestos */}
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Presupuestos</div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm block">
                Contrato (€)
                <input
                  type="number"
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={contractBudget}
                  onChange={(e) => setContractBudget(e.target.value)}
                />
              </label>
              <label className="text-sm block">
                Final (€)
                <input
                  type="number"
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={finalBudget}
                  onChange={(e) => setFinalBudget(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          className="w-full mt-6 bg-black text-white py-3 rounded-lg text-base font-semibold"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
