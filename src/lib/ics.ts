import { createEvents } from 'ics';
import { saveAs } from 'file-saver';
import type { Project } from './types';

export function downloadICS(p: Project) {
  const { error, value } = createEvents([{
    start: toArray(p.startDate),
    end: toArray(p.endDate),
    title: p.title,
    description: p.desc || '',
  }]);
  if (error) return console.error(error);
  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, `${p.title}.ics`);
}

function toArray(iso: string) {
  const d = new Date(iso);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}
