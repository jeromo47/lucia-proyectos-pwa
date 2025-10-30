// src/lib/google.ts
// Stub de Google Calendar para build sin dependencia externa.
// Exporta funciones no-op con las MISMAS firmas que usa la app.

const CALENDAR_ENABLED = import.meta.env.VITE_CALENDAR_ENABLED === 'true';
export const isCalendarEnabled = CALENDAR_ENABLED;

// Estado de sesión (stub)
export function isSignedIn(): boolean {
  return false;
}

// Login/Logout (stub)
export async function signIn(): Promise<void> {
  console.warn('[Google Calendar] signIn() llamado, integración desactivada.');
}
export async function signOut(): Promise<void> {
  console.warn('[Google Calendar] signOut() llamado, integración desactivada.');
}

// Inicialización (stub)
export async function initGoogle(): Promise<void> {
  // Sin carga de SDK si está desactivado.
}

// Listar eventos (firma usada por Home.tsx)
export async function listEvents(
  _calendarId: string,
  _startISO: string,
  _endISO: string
): Promise<any[]> {
  return [];
}

// Crear/actualizar/borrar eventos con firmas compatibles
export async function createCalendarEvent(
  _calendarId: string,
  _event: any
): Promise<null> {
  console.warn('[Google Calendar] createCalendarEvent() llamado, integración desactivada.');
  return null;
}

export async function updateCalendarEvent(
  _calendarId: string,
  _eventId: string,
  _patch: any
): Promise<null> {
  console.warn('[Google Calendar] updateCalendarEvent() llamado, integración desactivada.');
  return null;
}

export async function deleteCalendarEvent(
  _calendarId: string,
  _eventId?: string | null
): Promise<void> {
  console.warn('[Google Calendar] deleteCalendarEvent() llamado, integración desactivada.');
}
