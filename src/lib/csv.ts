import Papa from 'papaparse';
import type { Project } from './types';

/** Exporta proyectos a CSV compatible con el esquema de iOS (#schema=1) */
export function exportCSV(projects: Project[]): string {
  const rows = projects.map(p => ({
    id: p.id,
    title: p.title,
    desc: p.desc || '',
    startDate: p.startDate,
    endDate: p.endDate,
    contractBudget: p.contractBudget ?? '',
    finalBudget: p.finalBudget ?? '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    calendarEventId: p.calendarEventId ?? ''
  }));
  const csv = Papa.unparse(rows, { quotes: true });
  return '#schema=1\n' + csv;
}

/** Importa un CSV con formato #schema=1 a lista de proyectos */
export function importCSV(text: string): Project[] {
  const lines = text.split('\n').filter(l => !l.startsWith('#'));
  const csv = lines.join('\n');
  const res = Papa.parse(csv, { header: true });
  return (res.data as any[]).map(row => ({
    id: row.id,
    title: row.title,
    desc: row.desc,
    startDate: row.startDate,
    endDate: row.endDate,
    contractBudget: row.contractBudget ? Number(row.contractBudget) : undefined,
    finalBudget: row.finalBudget ? Number(row.finalBudget) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    calendarEventId: row.calendarEventId || null,
    notes: ''
  })) as Project[];
}
