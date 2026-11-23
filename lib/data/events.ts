import { createClient } from '@/lib/supabase/client'
import type { CustomEvent } from '@/types'

export async function listEventsInRange(startDate: string, endDate: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date')
  return (data as CustomEvent[]) || []
}

export async function createEvent(input: { title: string; event_date: string; notes?: string | null; user_id: string }) {
  const supabase = createClient()
  const { error } = await supabase.from('events').insert(input)
  return { error }
}

export async function updateEvent(id: string, patch: { title: string; event_date: string; notes?: string | null }) {
  const supabase = createClient()
  const { error } = await supabase.from('events').update(patch).eq('id', id)
  return { error }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('events').delete().eq('id', id)
  return { error }
}

export async function getUnsyncedEventsCount() {
  const supabase = createClient()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('google_event_id', null)
    .gte('event_date', new Date().toISOString().slice(0, 10))
  return count || 0
}
