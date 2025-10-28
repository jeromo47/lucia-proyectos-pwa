import { useState } from 'react';
import { useMonthGrid } from '@/hooks/useMonth';
import type { Project } from '@/lib/types';
import { colorFor } from '@/lib/color';
import DayProjectsSheet from './DayProjectsSheet';

export default function MonthBoard({
  projects,
  date = new Date(),
  onPickProject
}: {
  projects: Project[];
  date?: Date;
  onPickProject?: (p: Project) => void;
}) {
  const { grid, cells, stats } = useMonthGrid(date, projects);
  const today = new Date().toDateString();
  const [open, setOpen] = useState(false);
  const [dayItems, setDayItems] = useState<Project[]>([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>Libres {stats.free} | Ocupados {stats.busy} | Con solape {stats.overlap}</div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map(d => {
          const key = d.toDateString();
          const list = cells[key] || [];
          const isToday = key === today;
          const overlap = list.length >= 2;
          return (
            <div
              key={key}
              className={`h-16 p-1 rounded-md border ${isToday ? 'day-today' : ''} ${overlap ? 'day-overlap' : ''}`}
              onClick={() => { setDayItems(list); setOpen(true); }}
            >
              <div className="text-[11px] text-gray-600">{d.getDate()}</div>
              <div className="flex gap-1 flex-wrap mt-1">
                {list.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); onPickProject?.(p); }}
                    className="h-2 w-4 rounded"
                    style={{ backgroundColor: colorFor(p.id) }}
                    title={p.title}
                  />
                ))}
                {list.length > 3 && <span className="text-[10px]">+{list.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-card p-3">
        <div className="text-sm font-semibold mb-1">Proyectos del mes</div>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => (
            <span key={p.id} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: colorFor(p.id) }}>
              {p.title}
            </span>
          ))}
        </div>
      </div>

      <DayProjectsSheet open={open} onClose={() => setOpen(false)} items={dayItems} />
    </div>
  );
}
