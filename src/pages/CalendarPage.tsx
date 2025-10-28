import { useEffect, useState } from 'react';
import HeaderBar from '@/components/HeaderBar';
import { listProjects } from '@/lib/db';
import type { Project } from '@/lib/types';
import MonthBoard from '@/components/MonthBoard';
import Modal from '@/components/Modal';
import ProjectCard from '@/components/ProjectCard';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [picked, setPicked] = useState<Project | null>(null);
  const nav = useNavigate();

  useEffect(() => { listProjects().then(setItems); }, []);

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-5 space-y-4">
        <MonthBoard projects={items} onPickProject={p => setPicked(p)} />
      </div>

      <Modal open={!!picked} onClose={() => setPicked(null)}>
        {picked && (
          <div className="space-y-3">
            <ProjectCard p={picked} onClick={() => nav(`/project/${picked.id}`)} />
            <button className="w-full py-3 rounded-xl bg-black text-white" onClick={() => nav(`/project/${picked.id}`)}>
              Abrir detalle
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
