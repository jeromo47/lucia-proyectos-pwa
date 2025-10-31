// src/pages/Settings.tsx
import HeaderBar from '@/components/HeaderBar'
import { useSettings } from '@/state/settings'
import { Link } from 'react-router-dom'
import { ensurePermission, rescheduleAll } from '@/lib/notifications'
import { useSession } from '@/state/session'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function Settings() {
  const { settings, setSettings } = useSettings()
  const { user, loading, signOut } = useSession()
  const [email, setEmail] = useState('')

  async function signInWithProvider(provider: 'google' | 'github') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      console.error(error)
      alert(`Error al iniciar sesión con ${provider}: ` + error.message)
      return
    }
    if (data?.url) {
      // Fuerza navegación completa (evita bloqueos de pop-up)
      window.location.href = data.url
    }
  }

  async function sendMagicLink() {
    if (!email) {
      alert('Introduce un email válido')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      console.error(error)
      alert('Error enviando enlace mágico: ' + error.message)
    } else {
      alert('Te envié un enlace de acceso al correo.')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-5 space-y-4">

        {/* Cuenta */}
        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Cuenta</div>

          {loading ? (
            <div className="text-sm text-gray-500">Cargando sesión…</div>
          ) : user ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm">
                Conectado como{' '}
                <span className="font-medium">
                  {user.email ?? user.id}
                </span>
              </div>
              <button
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                onClick={() => signOut()}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={() => signInWithProvider('google')}
                >
                  Entrar con Google
                </button>
                <button
                  className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={() => signInWithProvider('github')}
                >
                  Entrar con GitHub
                </button>
              </div>

              <div className="text-xs uppercase text-gray-500 mt-3">o acceso por email</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
                <button
                  className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={sendMagicLink}
                >
                  Enviar enlace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recordatorios */}
        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Recordatorios</div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={async (e) => {
                if (e.target.checked) {
                  if (await ensurePermission()) {
                    setSettings((s) => ({ ...s, remindersEnabled: true }))
                  }
                } else {
                  setSettings((s) => ({ ...s, remindersEnabled: false }))
                }
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
              onChange={async (e) => {
                setSettings((s) => ({ ...s, reminderLeadMinutes: Number(e.target.value) }))
                await rescheduleAll()
              }}
            >
              {[60, 180, 360, 720, 1440, 2880, 4320].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Campos personalizados */}
        <div className="section-card p-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Campos personalizados</div>
          <Link className="px-3 py-2 rounded-lg border inline-block hover:bg-gray-50" to="/custom-fields">
            Gestionar campos (máx. 5)
          </Link>
        </div>

        {/* Info de versión / integraciones */}
        <div className="text-xs text-gray-500">
          v1.2 • PWA • Supabase Cloud Database • Google Calendar (desactivado)
        </div>
      </div>
    </div>
  )
}
