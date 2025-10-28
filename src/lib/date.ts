import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Devuelve un texto tipo “1 ene 2025” */
export function fmt(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy', { locale: es });
}

/** Devuelve la fecha actual en ISO string */
export function todayISO() {
  return new Date().toISOString();
}
