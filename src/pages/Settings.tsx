import HeaderBar from '@/components/HeaderBar'
import { useSettings } from '@/state/settings'
import { Link } from 'react-router-dom'
import { ensurePermission, rescheduleAll } from '@/lib/notifications'
import { useSession } from '@/state/session'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const { settings, setSettings } = useSettings()
  const { user, loading, signOut } = useSession()

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-5 space-y-4">
        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Cuenta</div>

          {loading ? (
            <div className="text-sm text-gray-500">Cargando sesión…</div>
          ) : user ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                Conectado como <span className="font-medium">{user.email ?? user.id}</span>
              </div>
              <button className="px-3 py-2 rounded-lg border" onClick={() => signOut()}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                  })
                }
              >
                Entrar con Google
              </button>
              <button
                className="px-3 py-2 rounded-lg border"
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: { redirectTo: window.location.origin },
                  })
                }
              >
                Entrar con GitHub
              </button>
            </div>
          )}
        </div>

        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Recordatorios</div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={async e => {
                if (e.target.checked) {
                  if (await ensurePermission()) setSettings(s => ({ ...s, remindersEnabled: true }))
                } else setSettings(s => ({ ...s, remindersEnabled: false }))
                await rescheduleAll()
              }}
            />
            <span>Activar</span>
          </label>

          <label className="block mt-3 text-sm">
            Anticipación (min)
            <select
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={settings.reminderLeadMinutes}
              onChange={async e => {
                setSettings(s => ({ ...s, reminderLeadMinutes: Number(e.target.value) }))
                await rescheduleAll()
              }}
            >
              {[60, 180, 360, 720, 1440, 2880, 4320].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Campos personalizados</div>
          <Link className="px-3 py-2 rounded-lg border inline-block" to="/custom-fields">
            Gestionar campos (máx. 5)
          </Link>
        </div>

        <div className="text-xs text-gray-500">v1.2 • PWA • Supabase Cloud Database • Google Calendar (desactivado)</div>
      </div>
    </div>
  )
}
