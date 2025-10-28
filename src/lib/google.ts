declare global { interface Window { gapi: any; google?: any } }

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let gapiLoaded = false;

export async function loadGapi() {
  if (gapiLoaded) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
  await new Promise<void>((resolve) => window.gapi.load('client:auth2', () => resolve()));
  await window.gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    scope: SCOPES
  });
  gapiLoaded = true;
}

export function isSignedIn(): boolean {
  try { return window.gapi.auth2.getAuthInstance().isSignedIn.get(); } catch { return false; }
}
export async function signIn() { await loadGapi(); await window.gapi.auth2.getAuthInstance().signIn(); }
export async function signOut() { await loadGapi(); await window.gapi.auth2.getAuthInstance().signOut(); }

export async function upsertCalendarEvent(calendarId: string, payload: {
  id?: string | null, title: string, desc?: string, startISO: string, endISO: string
}): Promise<string | null> {
  await loadGapi();
  if (!isSignedIn()) await signIn();
  const body = {
    summary: payload.title,
    description: payload.desc || '',
    start: { dateTime: payload.startISO },
    end: { dateTime: payload.endISO }
  };
  if (payload.id) {
    const res = await window.gapi.client.calendar.events.patch({ calendarId, eventId: payload.id, resource: body });
    return res.result.id || null;
  }
  const res = await window.gapi.client.calendar.events.insert({ calendarId, resource: body });
  return res.result.id || null;
}

export async function deleteCalendarEvent(calendarId: string, eventId?: string | null) {
  if (!eventId) return;
  await loadGapi();
  if (!isSignedIn()) await signIn();
  await window.gapi.client.calendar.events.delete({ calendarId, eventId });
}
