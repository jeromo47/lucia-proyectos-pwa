declare global { interface Window { gapi: any; } }

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let gapiLoaded = false;

export async function loadGapi() {
  if (gapiLoaded && window.gapi?.client) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gapi load error'));
    document.head.appendChild(s);
  });
  await new Promise<void>((resolve) => window.gapi.load('client:auth2', resolve));
  await window.gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    scope: SCOPES,
  });
  gapiLoaded = true;
}

export function isSignedIn(): boolean {
  try { return window.gapi.auth2.getAuthInstance().isSignedIn.get(); } catch { return false; }
}

export async function signIn() {
  await loadGapi();
  if (!isSignedIn()) {
    await window.gapi.auth2.getAuthInstance().signIn();
  }
}

export async function signOut() {
  await loadGapi();
  if (isSignedIn()) {
    await window.gapi.auth2.getAuthInstance().signOut();
  }
}

export async function upsertCalendarEvent(
  calendarId: string,
  payload: { id?: string | null; title: string; desc?: string; startISO: string; endISO: string }
): Promise<string | null> {
  await loadGapi();
  if (!isSignedIn()) await signIn();

  const resource = {
    summary: payload.title,
    description: payload.desc || '',
    start: { dateTime: payload.startISO },
    end: { dateTime: payload.endISO },
  };

  if (payload.id) {
    const res = await window.gapi.client.calendar.events.patch({
      calendarId,
      eventId: payload.id,
      resource,
    });
    return res.result.id || null;
  } else {
    const res = await window.gapi.client.calendar.events.insert({
      calendarId,
      resource,
    });
    return res.result.id || null;
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId?: string | null) {
  if (!eventId) return;
  await loadGapi();
  if (!isSignedIn()) await signIn();
  await window.gapi.client.calendar.events.delete({ calendarId, eventId });
}

/**
 * Lista eventos entre timeMin y timeMax (ISO) y los mapea a {id,title,desc,startISO,endISO}
 */
export async function listEvents(calendarId: string, timeMinISO: string, timeMaxISO: string): Promise<
  { id: string; title: string; desc: string; startISO: string; endISO: string }[]
> {
  await loadGapi();
  if (!isSignedIn()) await signIn();

  const res = await window.gapi.client.calendar.events.list({
    calendarId,
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  });

  const items = res.result.items || [];
  return items
    .filter((it: any) => it.start?.dateTime && it.end?.dateTime)
    .map((it: any) => ({
      id: it.id as string,
      title: (it.summary as string) || '(Sin título)',
      desc: (it.description as string) || '',
      startISO: it.start.dateTime as string,
      endISO: it.end.dateTime as string,
    }));
}
