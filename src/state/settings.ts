import { useState } from 'react';

export interface Settings {
  remindersEnabled: boolean;
  reminderLeadMinutes: number;
}

export function useSettings() {
  const stored = localStorage.getItem('lucia-settings');
  const [settings, setSettingsState] = useState<Settings>(
    stored ? JSON.parse(stored) : { remindersEnabled: false, reminderLeadMinutes: 60 }
  );

  const setSettings = (updater: (s: Settings) => Settings) => {
    setSettingsState((prev) => {
      const next = updater(prev);
      localStorage.setItem('lucia-settings', JSON.stringify(next));
      return next;
    });
  };

  return { settings, setSettings };
}
