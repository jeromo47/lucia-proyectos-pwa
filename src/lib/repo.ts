import { createClient, SupabaseClient } from '@supabase/supabase-js'

/* =========================================================
   Tipos de dominio (usados por la app)
   ========================================================= */

export type Project = {
  id?: string
  // Identidad
  name: string
  producer?: string
  contact?: string
  city?: string
  description?: string
  notes?: string
  // Dinero
  budget?: number
  budgetTeam?: number
  // Estado
  confirmed: boolean
  // Fechas (YYYY-MM-DD)
  rodajeStart: string
  rodajeEnd: string
  fittingStart?: string | null
  fittingEnd?: string | null
  prepStart?: string | null
  prepEnd?: string | null
  // Meta
  created_at?: string
  updated_at?: string
}

type DbProjectRow = {
  id?: string
  user_id?: string | null
  name: string
  producer?: string | null
  contact?: string | null
  city?: string | null
  description?: string | null
  notes?: string | null
  budget?: number | null
  budget_team?: number | null
  confirmed: boolean
  rodaje_start: string // 'YYYY-MM-DD'
  rodaje_end: string   // 'YYYY-MM-DD'
  fitting_start?: string | null
  fitting_end?: string | null
  prep_start?: string | null
  prep_end?: string | null
  created_at?: string
  updated_at?: string
}

/* =========================================================
   Cliente Supabase (singleton)
   ========================================================= */

let _supabase: SupabaseClient | null = null

function supabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!url || !anon) {
    throw new Error('Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  }
  _supabase = createClient(url, anon, {
    auth: {
      persistSession: true,
      storageKey: 'lucia-proyectos-auth',
    },
    global: { headers: { 'x-application-name': 'lucia-proyectos-pwa' } },
  })
  return _supabase
}

/* =========================================================
   Helpers de mapeo DB ↔ App (fechas como texto ISO YYYY-MM-DD)
   ========================================================= */

function toProject(row: DbProjectRow): Project {
  return {
    id: row.id,
    name: row.name ?? '',
    producer: row.producer ?? '',
    contact: row.contact ?? '',
    city: row.city ?? '',
    description: row.description ?? '',
    notes: row.notes ?? '',
    budget: row.budget ?? 0,
    budgetTeam: row.budget_team ?? 0,
    confirmed: !!row.confirmed,

    rodajeStart: row.rodaje_start,
    rodajeEnd: row.rodaje_end,
    fittingStart: row.fitting_start ?? null,
    fittingEnd: row.fitting_end ?? null,
    prepStart: row.prep_start ?? null,
    prepEnd: row.prep_end ?? null,

    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function fromProject(p: Project, userId?: string | null): DbProjectRow {
  return {
    id: p.id,
    user_id: userId ?? null,
    name: p.name,
    producer: p.producer ?? null,
    contact: p.contact ?? null,
    city: p.city ?? null,
    description: p.description ?? null,
    notes: p.notes ?? null,
    budget: p.budget ?? 0,
    budget_team: p.budgetTeam ?? 0,
    confirmed: !!p.confirmed,

    // Fechas: siempre 'YYYY-MM-DD'
    rodaje_start: p.rodajeStart,
    rodaje_end: p.rodajeEnd,
    fitting_start: p.fittingStart ?? null,
    fitting_end: p.fittingEnd ?? null,
    prep_start: p.prepStart ?? null,
    prep_end: p.prepEnd ?? null,
  }
}

/* =========================================================
   Auth auxiliar (opcional). Si no usas auth, se ignora el filtro.
   ========================================================= */

async function getUserIdOrNull(): Promise<string | null> {
  const sb = supabase()
  try {
    const { data } = await sb.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/* =========================================================
   Repositorio de proyectos
   ========================================================= */

/**
 * Obtiene todos los proyectos del usuario (o todos si no hay auth).
 * Ordena por fecha de inicio de rodaje ascendente.
 */
export async function getProjects(): Promise<Project[]> {
  const sb = supabase()
  const userId = await getUserIdOrNull()

  // Si tienes RLS por user_id, filtra; si no, quita el .eq('user_id', userId)
  const userIdFilter = userId ? (q: any) => q.eq('user_id', userId) : (q: any) => q

  const { data, error } = await userIdFilter(
    sb.from('projects')
      .select('*')
      .order('rodaje_start', { ascending: true })
  )
  if (error) throw new Error(error.message)
  return (data as DbProjectRow[]).map(toProject)
}

/** Obtiene un proyecto por id. */
export async function getProject(id: string): Promise<Project | null> {
  const sb = supabase()
  const userId = await getUserIdOrNull()
  const userIdFilter = userId ? (q: any) => q.eq('user_id', userId) : (q: any) => q

  const { data, error } = await userIdFilter(
    sb.from('projects').select('*').eq('id', id).limit(1).single()
  )
  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(error.message)
  }
  return toProject(data as DbProjectRow)
}

/**
 * Inserta o actualiza un proyecto.
 * - Si `p.id` existe → update
 * - Si no existe → insert (genera id en DB)
 */
export async function upsertProject(p: Project): Promise<Project> {
  const sb = supabase()
  const userId = await getUserIdOrNull()

  const payload = fromProject(p, userId)
  let resp

  if (p.id) {
    resp = await sb.from('projects').update(payload).eq('id', p.id).select('*').single()
  } else {
    resp = await sb.from('projects').insert(payload).select('*').single()
  }

  if (resp.error) throw new Error(resp.error.message)
  return toProject(resp.data as DbProjectRow)
}

/** Elimina un proyecto por id. */
export async function deleteProject(id: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* =========================================================
   (Opcional) Helpers por estado/categoría
   ========================================================= */

/** Devuelve proyectos confirmados vs pendientes (NO confirmados). */
export async function getByConfirmation() {
  const all = await getProjects()
  return {
    confirmed: all.filter(p => p.confirmed),
    pending: all.filter(p => !p.confirmed),
  }
}

/** Simple search local (por nombre y productora). */
export function searchProjectsLocal(list: Project[], q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return list
  return list.filter(p =>
    (p.name || '').toLowerCase().includes(s) ||
    (p.producer || '').toLowerCase().includes(s)
  )
}
