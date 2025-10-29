// src/lib/google.ts
// Stub seguro de Google Calendar: build-friendly cuando la integración está desactivada.
// Exporta todas las funciones más comunes como no-ops para evitar errores de import.

const CALENDAR_ENABLED = import.meta.env.VITE_CALENDAR_ENABLED === 'true';

export const isCalendarEnabled = CALENDAR_ENABLED;

/** Inicializa el SDK si estuviera activado (aquí no hace nada). */
export async function initGoogle(): Promise<void> {
  if (!CALENDAR_ENABLED) {
    // No cargar nada cuando está desactivado
    return;
  }
  // Si algún día reactivas Calendar, aquí iría la carga oficial del script:
  // const script = document.createElement('script');
  // script.src = 'https://apis.google.com/js/api.js';
  // document.head.appendChild(script);
  // await new Promise(res => (script.onload = res));
  // await gapi.client.init(...);
}

/** Estado de sesión con Google Calendar (stub: siempre false si desactivado). */
export function isSignedIn(): boolean {
  return false;
}

/** Login con Google Calendar (stub: no hace nada). */
export async function signIn(): Promise<void> {
  console.warn('[Google Calendar] signIn() llamado, pero la integración está desactivada.');
}

/** Logout con Google Calendar (stub: no hace nada). */
export async function signOut(): Promise<void> {
  console.warn('[Google Calendar] signOut() llamado, pero la integración está desactivada.');
}

/** Lista eventos del calendario (stub: devuelve lista vacía). */
export async function listEvents(_args?: any): Promise<any[]> {
  return [];
}

/** Crea un evento (stub: no hace nada, devuelve null). */
export async function createEvent(_event: any): Promise<null> {
  console.warn('[Google Calendar] createEvent() llamado, pero la integración está desactivada.');
  return null;
}

/** Actualiza un evento (stub). */
export async function updateEvent(_id: string, _patch: any): Promise<null> {
  console.warn('[Google Calendar] updateEvent() llamado, pero la integración está desactivada.');
  return null;
}

/** Borra un evento (stub). */
export async function deleteEvent(_id: string): Promise<void> {
  console.warn('[Google Calendar] deleteEvent() llamado, pero la integración está desactivada.');
}
