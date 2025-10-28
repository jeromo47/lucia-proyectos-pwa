import { useEffect, useMemo, useState } from 'react';
import HeaderBar from '@/components/HeaderBar';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import ProjectCard from '@/components/ProjectCard';
import ProjectForm from '@/components/ProjectForm';
import { listProjects, deleteProject, db } from '@/lib/db';
import type { Project, TabKey } from '@/lib/types';
import { parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { downloadICS } from '@/lib/ics';
import { isSignedIn, signIn, listEvents } from '@/lib/google';
import ImportExportSheet from '@/components/ImportExportSheet';
import RemindersSheet from '@/components/RemindersSheet';
import { useNavigate } from 'react-router-dom';
import ActionSheet, { type SheetAction } from '@/components/ActionSheet';

const CAL_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID;

export default function Home() {
  const [tab, setTab] = useState<TabKey>('current');
  const [items, setItems] = useState<Project[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [googleOn, setGoogleOn] = useState<boolean>(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openIE, setOpenIE] = useState(false);
  const [openRem, setOpenRem] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const nav = useNavigate();

  const refresh = async () => setItems(await listProjects());
  useEffect(() => { refresh(); }, []);

  const now = new Date();
  const filtered = useMemo(() => {
    return items.filter(p => {
      const s = parseISO(p.startDate), e = parseISO(p.endDate);
      if (tab === 'current') return s <= now && now <= e;
      if (tab === 'pending') return isAfter(s, now);
      return isBefore(e, now);
    });
  }, [items, tab]);

  const toggleSel = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Eliminar ${selected.size} proyectos?`)) return;
    await db.transaction('rw', db.projects, async () => {
      for (const id of selected) await deleteProject(id);
    });
    setSelected(new Set());
    refresh();
  };

  const pullFromGoogle = async () => {
    await signIn().catch(()=>{});
    setGoogleOn(isSignedIn());
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();
    const events = await listEvents(CAL_ID, start, end);
    await db.transaction('rw', db.projects, async () => {
      for (const ev of events) {
        const existing = await db.projects.where('calendarEventId').equals(ev.id).first();
        const base: Project = existing ?? {
          id: crypto.randomUUID(),
          title: ev.title, desc: ev.desc, notes: '',
          startDate: ev.startISO, endDate: ev.endISO,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contractBudget: undefined, finalBudget: undefined,
          calendarEventId: ev.id
        };
        const next = { ...base, title: ev.title, desc: ev.desc, startDate: ev.startISO, endDate: ev.endISO, updatedAt: new Date().toISOString(), calendarEventId: ev.id };
        await db.projects.put(next);
      }
    });
    refresh();
  };

  const actions: SheetAction[] = [
    { label: 'Importar / Exportar CSV', onClick: () => { setOpenMenu(false); setOpenIE(true); } },
    { label: googleOn ? 'Google conectado' : 'Conectar Google', onClick: async () => { setOpenMenu(false); await signIn().catch(()=>{}); setGoogleOn(isSignedIn()); } },
    { label: 'Sincronizar (Pull Google)', onClick: () => { setOpenMenu(false); pullFromGoogle(); } },
    { label: 'Recordatorios', onClick: () => { setOpenMenu(false); setOpenRem(true); } },
    { label: selectMode ? 'Salir de selección' : 'Selección múltiple', onClick: () => { setOpenMenu(false); setSelectMode(v=>!v); setSelected(new Set()); } },
    { label: 'Ajustes', onClick: () => { setOpenMenu(false); nav('/settings'); } },
  ];

  return (
    <div className="h-full flex flex-col">
      <HeaderBar onMenu={() => setOpenMenu(true)} />

      <div className="p-5 space-y-5">
        {/* Tabs centradas */}
        <div className="flex justify-center">
          <Tabs value={tab} onChange={setTab} />
        </div>

        {/* Barra de acciones cuando hay selección */}
        {selectMode && (
          <div className="sticky top-[56px] z-10 bg-white/90 backdrop-blur border rounded-xl px-3 py-2 flex items-center justify-between">
            <div className="text-sm text-gray-700">{selected.size} seleccionados</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg border text-red-600" onClick={bulkDelete}>Eliminar</button>
              <button className="px-3 py-1 rounded-lg border" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="relative flex items-start gap-3">
              {selectMode && (
                <input type="checkbox" className="mt-4" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} />
              )}
              <div className="flex-1">
                <ProjectCard p={p} onClick={() => nav(`/project/${p.id}`)} />
                <div className="absolute right-3 top-3 flex gap-2 text-xs">
                  <button className="underline" onClick={() => downloadICS(p)}>ICS</button>
                  <button className="underline" onClick={() => { setEditing(p); setOpenForm(true); }}>Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(undefined); setOpenForm(true); }}
        className="fixed bottom-[calc(28px+var(--safe-b))] left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-black text-white text-4xl leading-[64px] shadow-xl transition active:scale-95 z-50"
        aria-label="Añadir proyecto"
        title="Añadir proyecto" 
      >
        +
      </button>

      <Modal open={openForm} onClose={() => setOpenForm(false)}>
        <ProjectForm initial={editing} onSaved={() => { setOpenForm(false); refresh(); }} googleSync={googleOn} />
      </Modal>

      <ImportExportSheet open={openIE} onClose={() => { setOpenIE(false); refresh(); }} />
      <RemindersSheet open={openRem} onClose={() => setOpenRem(false)} />
      <ActionSheet open={openMenu} onClose={() => setOpenMenu(false)} actions={actions} />
    </div>
  );
}
