import { fmt } from '@/lib/date';
import { colorFor } from '@/lib/color';
import type { Project } from '@/lib/types';

export default function ProjectCard({ p, onClick }: { p: Project; onClick?: () => void }) {
  const c = colorFor(p.id);
  return (
    <div
      onClick={onClick}
      className="section-card p-4 cursor-pointer transition hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: c }}></div>
        <div className="font-semibold">{p.title}</div>
      </div>
      <div className="text-sm text-gray-600 mt-1">
        {fmt(p.startDate)} — {fmt(p.endDate)}
      </div>
    </div>
  );
}
