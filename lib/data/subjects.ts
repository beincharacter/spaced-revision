import { createClient } from '@/lib/supabase/client'
import type { Subject } from '@/types'

export async function listSubjects() {
  const supabase = createClient()
  const { data } = await supabase.from('subjects').select('*').order('created_at')
  return (data as Subject[]) || []
}

export async function listSubjectsByName() {
  const supabase = createClient()
  const { data } = await supabase.from('subjects').select('*').order('name')
  return (data as Subject[]) || []
}

export async function listSubjectsBasic() {
  const supabase = createClient()
  const { data } = await supabase.from('subjects').select('id, name, color')
  return (data as Pick<Subject, 'id' | 'name' | 'color'>[]) || []
}

export async function listSubjectsBasicByName() {
  const supabase = createClient()
  const { data } = await supabase.from('subjects').select('id, name, color').order('name')
  return (data as Pick<Subject, 'id' | 'name' | 'color'>[]) || []
}

export async function listSubjectNames(userId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('subjects').select('name').eq('user_id', userId)
  return (data || []).map(s => s.name as string)
}

export async function createSubject(input: { name: string; color: string; user_id: string }) {
  const supabase = createClient()
  const { error } = await supabase.from('subjects').insert(input)
  return { error }
}

export async function createSubjects(inputs: { name: string; color: string; user_id: string }[]) {
  const supabase = createClient()
  const { error } = await supabase.from('subjects').insert(inputs)
  return { error }
}

export async function updateSubject(id: string, patch: { name: string; color: string }) {
  const supabase = createClient()
  const { error } = await supabase.from('subjects').update(patch).eq('id', id)
  return { error }
}

export async function deleteSubject(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  return { error }
}

export async function deleteSubjects(ids: string[]) {
  const supabase = createClient()
  const { error } = await supabase.from('subjects').delete().in('id', ids)
  return { error }
}
