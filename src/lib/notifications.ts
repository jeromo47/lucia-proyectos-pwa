import { db } from './db';
import { parseISO, subMinutes, isAfter } from 'date-fns';
import { Settings } from '@/state/settings';

export async function ensurePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

let timers: number[] = [];
export function clearTimers() { timers.forEach(id => clearTimeout(id)); timers = []; }

export async function rescheduleAll() {
  clearTimers();
  const raw = localStorage.getItem('lucia-settings');
  const settings: Settings = raw ? JSON.parse(raw) : { remindersEnabled:false, reminderLeadMinutes:60 };
  if (!settings.remindersEnabled) return;
  const lead = settings.reminderLeadMinutes;
  const list = await db.projects.toArray();
  const now = new Date();
  list.forEach(p => {
    const at = subMinutes(parseISO(p.startDate), lead);
    if (isAfter(at, now)) {
      const ms = at.getTime() - now.getTime();
      const id = window.setTimeout(()=> {
        new Notification(p.title, { body: `Empieza el proyecto ${p.title}` });
      }, ms);
      timers.push(id);
    }
  });
}
