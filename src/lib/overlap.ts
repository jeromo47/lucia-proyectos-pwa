import { parseISO } from 'date-fns';
import type { Project } from './types';

/** Comprueba si dos intervalos [start,end] se solapan */
export function overlaps(a: Project, b: Project): boolean {
  const a1 = parseISO(a.startDate), a2 = parseISO(a.endDate);
  const b1 = parseISO(b.startDate), b2 = parseISO(b.endDate);
  return a1 <= b2 && b1 <= a2;
}

/** Busca si un nuevo proyecto solapa con otros */
export function findOverlap(newP: Project, all: Project[]): Project | undefined {
  return all.find(p => p.id !== newP.id && overlaps(p, newP));
}
