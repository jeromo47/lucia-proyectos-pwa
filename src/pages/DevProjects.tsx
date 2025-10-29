// src/pages/DevProjects.tsx
import { useEffect, useState } from 'react'
import { useSession } from '@/state/session'
import { Project, getProjects, createProject, deleteProject } from '@/lib/repo'

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function DevProjects() {
  const { user, loading } = useSession()
  const [items, setItems] = useState<Project[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const data = await getProjects()
      setItems(data)
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando proyectos')
    }
  }

  useEffect(() => { if (user) load() }, [user])

  async function addSample() {
    if (!user) return
    setBusy(true); setError(null)
    try {
      const today = new Date()
      const in3 = new Date(today); in3.setDate(in3.getDate() + 3)
      const sample = {
        confirmed: true,
        name: 'Proyecto de prueba',
        producer: 'Producer S.L.',
        contact: 'contacto@ejemplo.com',
        city: 'Madrid',
        description: 'Proyecto creado desde DevProjects',
        notes: '',
        budget: 1000,
        teamBudget: 300,
        colorSeed: null,
        rodajeStart: iso(today),
        rodajeEnd: iso(in3),
        fittingStart: null,
        fittingEnd: null,
        prepStart: null,
        prepEnd: null,
      } as const
      await createProject(sample as any)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Error creando proyecto')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true); setError(null)
    try {
      await deleteProject(id)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando proyecto')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-6">Cargando sesión…</div>
  if (!user) return <div className="p-6">No has iniciado sesión. Ve a <a className="underline" href="/settings">Settings</a> y entra con Google o GitHub.</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">DevProjects (Supabase)</h1>
        <button className="px-3 py-2 rounded-lg border" onClick={addSample} disabled={busy}>
          {busy ? 'Creando…' : 'Crear proyecto de prueba'}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="space-y-2">
        {items.length === 0 && <div className="text-sm text-gray-500">No hay proyectos aún.</div>}
        {items.map(p => (
          <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">
                {p.city} • {p.rodajeStart} → {p.rodajeEnd} • {p.confirmed ? 'Confirmado' : 'Pendiente'}
              </div>
            </div>
            <button className="text-sm text-red-600" onClick={() => remove(p.id)} disabled={busy}>
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
