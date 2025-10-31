// src/lib/repo.ts
import { supabase } from './supabase'

export interface Project {
  id: string
  user_id: string
  confirmed: boolean
  name: string
  producer: string
  contact: string
  city: string
  description: string
  notes: string
  budget: number | null
  teamBudget: number | null
  color_seed: string | null

  rodajeStart: string
  rodajeEnd: string
  fittingStart: string | null
  fittingEnd: string | null
  prepStart: string | null
  prepEnd: string | null

  created_at?: string
  updated_at?: string
}

// ------------ helpers de mapeo DB (snake_case) ⇄ app (camelCase)
type DbRow = {
  id: string
  user_id: string
  confirmed: boolean
  name: string
  producer: string
  contact: string
  city: string
  description: string
  notes: string
  budget: number | null
  team_budget: number | null
  color_seed: string | null
  rodaje_start: string
  rodaje_end: string
  fitting_start: string | null
  fitting_end: string | null
  prep_start: string | null
  prep_end: string | null
  created_at?: string
  updated_at?: string
}

function rowToProject(r: DbRow): Project {
  return {
    id: r.id,
    user_id: r.user_id,
    confirmed: r.confirmed,
    name: r.name,
    producer: r.producer,
    contact: r.contact,
    city: r.city,
    description: r.description,
    notes: r.notes,
    budget: r.budget,
    teamBudget: r.team_budget,
    color_seed: r.color_seed,
    rodajeStart: r.rodaje_start,
    rodajeEnd: r.rodaje_end,
    fittingStart: r.fitting_start,
    fittingEnd: r.fitting_end,
    prepStart: r.prep_start,
    prepEnd: r.prep_end,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function toInsertPayload(p: Partial<Project> & { user_id: string }) {
  return {
    user_id: p.user_id,
    confirmed: p.confirmed ?? true,
    name: p.name ?? '',
    producer: p.producer ?? '',
    contact: p.contact ?? '',
    city: p.city ?? '',
    description: p.description ?? '',
    notes: p.notes ?? '',
    budget: p.budget ?? null,
    team_budget: p.teamBudget ?? null,
    color_seed: p.color_seed ?? null,
    rodaje_start: p.rodajeStart!,
    rodaje_end: p.rodajeEnd!,
    fitting_start: p.fittingStart ?? null,
    fitting_end: p.fittingEnd ?? null,
    prep_start: p.prepStart ?? null,
    prep_end: p.prepEnd ?? null,
  }
}

function toUpdatePayload(p: Partial<Project>) {
  const u: any = {}
  if ('confirmed' in p) u.confirmed = p.confirmed
  if ('name' in p) u.name = p.name
  if ('producer' in p) u.producer = p.producer
  if ('contact' in p) u.contact = p.contact
  if ('city' in p) u.city = p.city
  if ('description' in p) u.description = p.description
  if ('notes' in p) u.notes = p.notes
  if ('budget' in p) u.budget = p.budget ?? null
  if ('teamBudget' in p) u.team_budget = p.teamBudget ?? null
  if ('color_seed' in p) u.color_seed = p.color_seed ?? null
  if ('rodajeStart' in p) u.rodaje_start = p.rodajeStart
  if ('rodajeEnd' in p) u.rodaje_end = p.rodajeEnd
  if ('fittingStart' in p) u.fitting_start = p.fittingStart ?? null
  if ('fittingEnd' in p) u.fitting_end = p.fittingEnd ?? null
  if ('prepStart' in p) u.prep_start = p.prepStart ?? null
  if ('prepEnd' in p) u.prep_end = p.prepEnd ?? null
  return u
}

// ------------ lógica
export function getDurationRange(p: Project) {
  const start = p.prepStart ?? p.rodajeStart
  const end = p.rodajeEnd
  return { start, end }
}

export async function getProjects(): Promise<Project[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('rodaje_start', { ascending: true })

  if (error) throw error
  return (data ?? []).map(rowToProject)
}

export async function createProject(p: Partial<Project>): Promise<Project> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No autenticado')

  const payload = toInsertPayload({ ...p, user_id: user.id })
  const { data, error } = await supabase
    .from('projects')
    .insert([payload])
    .select('*')
    .single()

  if (error) throw error
  return rowToProject(data as DbRow)
}

export async function updateProject(id: string, p: Partial<Project>): Promise<Project> {
  const patch = toUpdatePayload(p)
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return rowToProject(data as DbRow)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
