import { useEffect, useState } from 'react';
import type { Project } from '@/lib/types';
import { listProjects, upsertProject, db } from '@/lib/db';
import { findOverlap } from '@/lib/overlap';
import { todayISO } from '@/lib/date';
import { v4 as uuidv4 } from 'uuid';
import { upsertCalendarEvent } from '@/lib/google';

const CAL_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID;

export default function ProjectForm({
  initial,
  onSaved,
  googleSync
}: {
  initial?: Project;
  onSaved: (p: Project) => void;
  googleSync?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [start, setStart] = useState(initial?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(initial?.endDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [contractBudget, setCB] = useState<string>(initial?.contractBudget?.toString() ?? '');
  const [finalBudget, setFB] = useState<string>(initial?.finalBudget?.toString() ?? '');
  const [overlapWarn, setOverlapWarn] = useState<Project | null>(null);

  const [customDefs, setCustomDefs] = useState<{ id: string; name: string }[]>([]);
  const [customs, setCustoms] = useState<Record<string, string>>({}); // name -> value

  useEffect(() => { db.fieldDefs.toArray().then(setCustomDefs); }, []);
  useEffect(() => {
    (async () => {
      if (!initial) return;
      const vals = await db.customValues.where({ projectId: initial.id }).toArray();
      const map: Record<string, string> = {};
      vals.forEach(v => (map[v.fieldName] = v.value));
      setCustoms(map);
    })();
  }, [initial?.id]);

  useEffect(() => {
    (async () => {
      const all = await listProjects();
      const draft: Project = {
        id: initial?.id ?? 'temp',
        title,
        desc,
        notes,
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
        contractBudget: contractBudget ? Number(contractBudget) : undefined,
        finalBudget: finalBudget ? Number(finalBudget) : undefined,
        createdAt: initial?.createdAt ?? todayISO(),
        updatedAt: todayISO(),
        calendarEventId: initial?.calendarEventId ?? null
      };
      const o = findOverlap(draft, all);
      setOverlapWarn(o || null);
    })();
  }, [title, desc, notes, start, end, contractBudget, finalBudget, initial?.id, initial?.createdAt, initial?.calendarEventId]);

  const valid = title.trim().length > 0 && start <= end;

  const save = async () => {
    if (!valid) return;
    const now = todayISO();
    const project: Project = {
      id: initial?.id ?? uuidv4(),
      title,
      desc,
      notes,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      contractBudget: contractBudget ? Number(contractBudget) : undefined,
      finalBudget: finalBudget ? Number(finalBudget) : undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      calendarEventId: initial?.calendarEventId ?? null
    };
    if (googleSync) {
      const id = await upsertCalendarEvent(CAL_ID, {
        id: project.calendarEventId,
        title: project.title,
        desc: project.desc,
        startISO: project.startDate,
        endISO: project.endDate
      }).catch(() => null);
      project.calendarEventId = id;
    }
    await upsertProject(project);
    await db.customValues.where({ projectId: project.id }).delete();
    for (const [fieldName, value] of Object.entries(customs)) {
      if (value?.trim()) await db.customValues.add({ id: uuidv4(), projectId: project.id, fieldName, value });
    }
    onSaved(project);
  };

  return (
    <div className="space-y-4">
      <div className="section-card p-4">
        <div className="text-xs uppercase text-gray-500 mb-2">Proyecto</div>
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Nombre" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="w-full mt-2 border rounded-lg px-3 py-2" placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)} />
        <textarea className="w-full mt-2 border rounded-lg px-3 py-2" placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="section-card p-4">
        <div className="text-xs uppercase text-gray-500 mb-2">Fechas</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Inicio<input type="date" className="w-full border rounded-lg px-3 py-2" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="text-sm">Fin<input type="date" className="w-full border rounded-lg px-3 py-2" value={end} onChange={e => setEnd(e.target.value)} /></label>
        </div>
        {start > end && <div className="text-red-600 text-sm mt-2">La fecha fin debe ser ≥ inicio.</div>}
        {overlapWarn && <div className="text-amber-600 text-sm mt-2">Aviso: solape con “{overlapWarn.title}”.</div>}
      </div>

      <div className="section-card p-4">
        <div className="text-xs uppercase text-gray-500 mb-2">Presupuestos</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Contrato (€)<input inputMode="decimal" className="w-full border rounded-lg px-3 py-2" value={contractBudget} onChange={e => setCB(e.target.value)} /></label>
          <label className="text-sm">Final (€)<input inputMode="decimal" className="w-full border rounded-lg px-3 py-2" value={finalBudget} onChange={e => setFB(e.target.value)} /></label>
        </div>
      </div>

      {customDefs.length > 0 && (
        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Campos personalizados</div>
          <div className="space-y-2">
            {customDefs.map(d => (
              <label key={d.id} className="block text-sm">
                {d.name}
                <input className="w-full border rounded-lg px-3 py-2 mt-1" value={customs[d.name] || ''} onChange={e => setCustoms(m => ({ ...m, [d.name]: e.target.value }))} />
              </label>
            ))}
          </div>
        </div>
      )}

      <button disabled={!valid} onClick={save} className="w-full py-3 rounded-xl bg-black text-white disabled:opacity-40">Guardar</button>
    </div>
  );
}
