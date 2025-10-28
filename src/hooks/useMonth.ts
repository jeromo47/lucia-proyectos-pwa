import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, subDays, addDays, parseISO } from 'date-fns';
import type { Project, MonthStats } from '@/lib/types';

export function useMonthGrid(date: Date, projects: Project[]) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  // Días reales del mes
  const days = eachDayOfInterval({ start, end });

  // Pad al inicio para que empiece en lunes (0..6)
  const startPad = (getDay(start) + 6) % 7;
  const paddedStart = subDays(start, startPad);

  // 6 filas * 7 columnas = 42 celdas
  const total = 42;
  const grid = Array.from({ length: total }, (_, i) => addDays(paddedStart, i));

  // Mapa día -> proyectos que caen en ese día
  const cells: Record<string, Project[]> = {};
  grid.forEach(d => { cells[d.toDateString()] = []; });
  projects.forEach(p => {
    const ps = parseISO(p.startDate), pe = parseISO(p.endDate);
    grid.forEach(d => { if (d >= ps && d <= pe) cells[d.toDateString()].push(p); });
  });

  const stats: MonthStats = {
    free: grid.filter(d => cells[d.toDateString()].length === 0).length,
    busy: grid.filter(d => cells[d.toDateString()].length >= 1).length,
    overlap: grid.filter(d => cells[d.toDateString()].length >= 2).length
  };

  return { grid, cells, stats };
}
