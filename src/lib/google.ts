// src/lib/google.ts
// Stub de Google Calendar: evita que el build falle cuando la integración está desactivada.
// Exporta funciones "no-op" para cubrir cualquier import existente.

const CALENDAR_ENABLED = import.meta.env.VITE_CALENDAR_ENABLED === 'true';
export const isCalendarEnabled = CALENDAR_ENABLED;

// Utilidad no-op
const warn = (fn: string) =>
  console.warn(`[Google Calendar] ${fn}() llamado, pero la integración está desactivada.`);

// Inicialización
export async function initGoogle(): Promise<void> {
  if (!CALENDAR_ENABLED) return;
  // Aquí iría la carga real del SDK si se reactivara en el futuro.
}

// Sesión
export function isSignedIn(): boolean { return false; }
export async function signIn(): Promise<void> { warn('signIn'); }
export async function signOut(): Promise<void> { warn('signOut'); }

// Lectura de calendarios/eventos
export async function listCalendars(): Promise<any[]> { return []; }
export async function listEvents(_args?: any): Promise<any[]> { return []; }

// CRUD de eventos (nombres múltiples para cubrir imports existentes)
export async function createEvent(_e: any): Promise<null> { warn('createEvent'); return null; }
export async function updateEvent(_id: string, _p: any): Promise<null> { warn('updateEvent'); return null; }
export async function deleteEvent(_id: string): Promise<void> { warn('deleteEvent'); }

export async function createCalendarEvent(_e: any): Promise<null> { warn('createCalendarEvent'); return null; }
export async function updateCalendarEvent(_id: string, _p: any): Promise<null> { warn('updateCalendarEvent'); return null; }
export async function deleteCalendarEvent(_id: string): Promise<void> { warn('deleteCalendarEvent'); }

// Otros helpers habituales (por si existen en tu código)
export async function ensureCalendar(_id?: string): Promise<null> { return null; }
export async function ensureAuthorized(): Promise<boolean> { return false; }
export async function addReminder(_e: any): Promise<void> { warn('addReminder'); }
export async function removeReminder(_id: string): Promise<void> { warn('removeReminder'); }
