const CALENDAR_ENABLED = import.meta.env.VITE_CALENDAR_ENABLED === 'true';

export async function initGoogle() {
  if (!CALENDAR_ENABLED) {
    console.warn('[Google Calendar] Integración desactivada por configuración');
    return;
  }

  try {
    const gapi = await import('gapi-script');
    await new Promise<void>((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar',
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (e) {
    console.error('Error inicializando Google API', e);
  }
}

export const isCalendarEnabled = CALENDAR_ENABLED;
