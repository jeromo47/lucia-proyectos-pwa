// src/lib/repo.ts
import { supabase } from '@/lib/supabase'

/**
 * Proyecto (modelo en app). Fechas en ISO string (YYYY-MM-DD) o null.
 * durationStart/durationEnd se calculan en UI a partir de prepStart/rodajeEnd.
 */
export type Project = {
  id: string
  confirmed: boolean
  name: string
  producer: string
  contact: string
  city: string
  description: string
  notes: string
  budget: number | null
  teamBudget: number | null
  colorSeed: string | null

  rodajeStart: string
  rodajeEnd: string
  fittingStart: string | null
  fittingEnd: string | null
  prepStart: string | null
  prepEnd: string | null

  createdAt: string
  updatedAt: string
}

type ProjectInsert = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
type ProjectUpdate = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>

/** Mapeo DB (snake_case) ↔ TS (camelCase) */
function fromRow(r: any): Project {
  return {
    id: r.id,
    confirmed: r.confirmed,
    name: r.name ?? '',
    producer: r.producer ?? '',
    contact: r.contact ?? '',
    city: r.city ?? '',
    description: r.description ?? '',
    notes: r.notes ?? '',
    budget: r.budget === null ? null : Number(r.budget),
    teamBudget: r.team_budget === null ? null : Number(r.team_budget),
    colorSeed: r.color_seed ?? null,
    rodajeStart: r.rodaje_start,
    rodajeEnd: r.rodaje_end,
    fittingStart: r.fitting_start,
    fittingEnd: r.fitting_end,
    prepStart: r.prep_start,
    prepEnd: r.prep_end,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(p: Partial<Project>) {
  return {
    confirmed: p.confirmed,
    name: p.name,
    producer: p.producer,
    contact: p.contact,
    city: p.city,
    description: p.description,
    notes: p.notes,
    budget: p.budget,
    team_budget: p.teamBudget,
    color_seed: p.colorSeed,
    rodaje_start: p.rodajeStart,
    rodaje_end: p.rodajeEnd,
    fitting_start: p.fittingStart,
    fitting_end: p.fittingEnd,
    prep_start: p.prepStart,
    prep_end: p.prepEnd,
  }
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('rodaje_start', { ascending: true })
  if (error) throw error
  return (data ?? []).map(fromRow)
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? fromRow(data) : null
}

export async function createProject(input: ProjectInsert): Promise<Project> {
  const row = toRow(input)
  const { data, error } = await supabase
    .from('projects')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function updateProject(id: string, patch: ProjectUpdate): Promise<Project> {
  const row = toRow(patch)
  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

/** Utilidad simple para filtrar por rango de fechas (duración total).
 * durationStart = prepStart ?? rodajeStart
 * durationEnd   = rodajeEnd
 */
export function getDurationRange(p: Project): { start: string; end: string } {
  const start = p.prepStart ?? p.rodajeStart
  const end = p.rodajeEnd
  return { start, end }
}
