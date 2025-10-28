import Modal from './Modal';
import { useSettings } from '@/state/settings';
import { ensurePermission, rescheduleAll } from '@/lib/notifications';

export default function RemindersSheet({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const { settings, setSettings } = useSettings();

  const enable = async () => {
    const ok = await ensurePermission();
    if (!ok) return;
    setSettings(s=>({ ...s, remindersEnabled: true }));
    await rescheduleAll();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-lg font-semibold">Recordatorios</div>

        <div className="section-card p-3 space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={e => e.target.checked ? enable() : setSettings(s=>({ ...s, remindersEnabled:false })) }
            />
            <span>Activar notificaciones</span>
          </label>

          <label className="block text-sm">
            Anticipación (min)
            <select
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={settings.reminderLeadMinutes}
              onChange={async e => {
                setSettings(s=>({ ...s, reminderLeadMinutes: Number(e.target.value) }));
                await rescheduleAll();
              }}
            >
              {[60,180,360,720,1440,2880,4320].map(v=> <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          <button className="w-full py-2 rounded-lg border" onClick={rescheduleAll}>
            Reprogramar recordatorios
          </button>
        </div>

        <button className="w-full py-3 rounded-xl bg-black text-white" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
