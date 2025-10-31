// src/lib/repo.ts
import { supabase } from './supabase'

// tipo de proyecto completo, incluyendo nuevos campos
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

// calcula rango de fechas “visibles” en home y calendario
export function getDurationRange(p: Project) {
  const start = p.prepStart ?? p.rodajeStart
  const end = p.rodajeEnd
  return { start, end }
}

// obtiene todos los proyectos del usuario autenticado
export async function getProjects(): Promise<Project[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('rodajeStart', { ascending: true })

  if (error) throw error
  return (data ?? []) as Project[]
}

// crea un nuevo proyecto
export async function createProject(p: Partial<Project>): Promise<Project> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No autenticado')

  const payload = {
    user_id: user.id,
    confirmed: p.confirmed ?? true,
    name: p.name ?? '',
    producer: p.producer ?? '',
    contact: p.contact ?? '',
    city: p.city ?? '',
    description: p.description ?? '',
    notes: p.notes ?? '',
    budget: p.budget ?? null,
    teamBudget: p.teamBudget ?? null,
    color_seed: p.color_seed ?? null,
    rodajeStart: p.rodajeStart,
    rodajeEnd: p.rodajeEnd,
    fittingStart: p.fittingStart ?? null,
    fittingEnd: p.fittingEnd ?? null,
    prepStart: p.prepStart ?? null,
    prepEnd: p.prepEnd ?? null,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data as Project
}

// actualiza un proyecto existente
export async function updateProject(id: string, p: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(p)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

// borra un proyecto
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
