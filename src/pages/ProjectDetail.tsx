// src/pages/ProjectDetail.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, deleteProject, type Project, getDurationRange } from '@/lib/repo'
import HeaderBar from '@/components/HeaderBar'
import ProjectForm from '@/components/ProjectForm'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [item, setItem] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const p = await getProject(id)
      if (!p) {
        setError('Proyecto no encontrado')
      } else {
        setItem(p)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando proyecto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleDelete() {
    if (!id) return
    const ok = confirm('¿Seguro que quieres eliminar este proyecto?')
    if (!ok) return
    try {
      await deleteProject(id)
      nav('/')
    } catch (e: any) {
      alert(e?.message ?? 'Error eliminando')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Proyecto</h1>
          <div className="flex gap-2">
            <a href="/settings" className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">Ajustes</a>
            {item && (
              <>
                <button
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  onClick={() => setEditing(true)}
                >
                  Editar
                </button>
                <button
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-red-50 text-red-600"
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && item && (
          <div className="space-y-3">
            <div className="text-xl font-medium">{item.name || 'Sin nombre'}</div>
            <div className="text-sm text-gray-500">
              {item.city ? `${item.city} • ` : ''}
              {getDurationRange(item).start} → {getDurationRange(item).end}
            </div>
            <div className="text-sm">
              <span className={`px-2 py-1 rounded ${item.confirmed ? 'bg-gray-100' : 'bg-red-100 text-red-700'}`}>
                {item.confirmed ? 'Confirmado' : 'Pendiente'}
              </span>
            </div>

            {(item.producer || item.contact) && (
              <div className="text-sm text-gray-700">
                {item.producer ? `Productora: ${item.producer}` : ''}{' '}
                {item.contact ? `• Contacto: ${item.contact}` : ''}
              </div>
            )}

            {item.description && (
              <div className="text-sm">
                <div className="text-gray-500 uppercase text-xs mb-1">Descripción</div>
                <div>{item.description}</div>
              </div>
            )}

            {item.notes && (
              <div className="text-sm">
                <div className="text-gray-500 uppercase text-xs mb-1">Notas</div>
                <div>{item.notes}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="section-card p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">Rodaje</div>
                <div>{item.rodajeStart} → {item.rodajeEnd}</div>
              </div>
              <div className="section-card p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">Fitting</div>
                <div>{item.fittingStart ? `${item.fittingStart} → ${item.fittingEnd ?? item.fittingStart}` : '—'}</div>
              </div>
              <div className="section-card p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">Preparación</div>
                <div>{item.prepStart ? `${item.prepStart} → ${item.prepEnd ?? item.prepStart}` : '—'}</div>
              </div>
              <div className="section-card p-3">
                <div className="text-xs uppercase text-gray-500 mb-1">Presupuestos</div>
                <div>Proyecto: {item.budget ?? '—'} € • Equipo: {item.teamBudget ?? '—'} €</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && item && (
        <ProjectForm
          editing={item}
          onClose={() => setEditing(false)}
          onSaved={async (pid) => {
            setEditing(false)
            await load()
          }}
        />
      )}
    </div>
  )
}
