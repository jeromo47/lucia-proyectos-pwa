import { useEffect, useState } from 'react';
import HeaderBar from '@/components/HeaderBar';
import { useParams, useNavigate } from 'react-router-dom';
import { db, deleteProject } from '@/lib/db';
import type { Project } from '@/lib/types';
import { fmt } from '@/lib/date';
import { colorFor } from '@/lib/color';
import Modal from '@/components/Modal';
import ProjectForm from '@/components/ProjectForm';
import { deleteCalendarEvent } from '@/lib/google';

const CAL_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID;

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Project | null>(null);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => { if (id) db.projects.get(id).then(setP); }, [id]);

  const remove = async () => {
    if (!p) return;
    if (!confirm('¿Eliminar este proyecto?')) return;
    await deleteCalendarEvent(CAL_ID, p.calendarEventId);
    await deleteProject(p.id);
    nav('/');
  };

  if (!p) return <div>Cargando...</div>;

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-5 space-y-5">
        <div className="section-card p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: colorFor(p.id) }}></div>
            <div className="font-semibold text-lg">{p.title}</div>
          </div>
          <div className="text-sm text-gray-600 mt-1">{fmt(p.startDate)} — {fmt(p.endDate)}</div>
        </div>

        {p.contractBudget && (
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Presupuestos</div>
            <div className="text-sm">Contrato: {p.contractBudget} €</div>
            {p.finalBudget && <div className="text-sm">Final: {p.finalBudget} €</div>}
          </div>
        )}

        {p.desc && (
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Descripción</div>
            <div className="text-sm">{p.desc}</div>
          </div>
        )}

        {p.notes && (
          <div className="section-card p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Notas</div>
            <div className="text-sm">{p.notes}</div>
          </div>
        )}

        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg border" onClick={() => setOpenEdit(true)}>Editar</button>
          <button className="flex-1 py-2 rounded-lg border text-red-600" onClick={remove}>Eliminar</button>
        </div>
      </div>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)}>
        <ProjectForm initial={p} onSaved={(np) => { setOpenEdit(false); setP(np); }} googleSync />
      </Modal>
    </div>
  );
}
