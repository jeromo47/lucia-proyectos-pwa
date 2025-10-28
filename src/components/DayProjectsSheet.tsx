import Modal from './Modal';
import ProjectCard from './ProjectCard';
import type { Project } from '@/lib/types';

export default function DayProjectsSheet({ open, onClose, items }: {
  open: boolean; onClose: ()=>void; items: Project[];
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-lg font-semibold">Proyectos del día</div>
        <div className="space-y-2">
          {items.map(p => <ProjectCard key={p.id} p={p} />)}
        </div>
        <button className="w-full py-3 rounded-xl bg-black text-white" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
