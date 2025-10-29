// src/lib/google.ts
// Stub seguro: no importa nada, no rompe el build y respeta el flag
const CALENDAR_ENABLED = import.meta.env.VITE_CALENDAR_ENABLED === 'true';

/** Inicialización vacía cuando está desactivado (o sin dependencia externa) */
export async function initGoogle(): Promise<void> {
  if (!CALENDAR_ENABLED) {
    console.warn('[Google Calendar] Integración desactivada por configuración');
    return;
  }
  // Si algún día reactivas Calendar, implementaremos aquí la carga del script oficial:
  // const script = document.createElement('script');
  // script.src = 'https://apis.google.com/js/api.js';
  // document.head.appendChild(script);
  // await new Promise(res => { script.onload = res; });
  // ...init gapi...
}

export const isCalendarEnabled = CALENDAR_ENABLED;
