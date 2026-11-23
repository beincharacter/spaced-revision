import { createClient } from '@/lib/supabase/client'
import type { Topic, Difficulty } from '@/types'

export async function listTopicsWithSubject() {
  const supabase = createClient()
  const { data } = await supabase
    .from('topics')
    .select('*, subject:subjects(*)')
    .order('created_at', { ascending: false })
  return (data as unknown as Topic[]) || []
}

export async function getTopicIdsForSubject(subjectId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('topics').select('id').eq('subject_id', subjectId)
  return (data || []).map((t: { id: string }) => t.id)
}

export async function getTopicCountForSubject(subjectId: string) {
  const supabase = createClient()
  const { count } = await supabase
    .from('topics')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', subjectId)
  return count || 0
}

export async function createTopic(input: {
  name: string
  subject_id: string
  difficulty: Difficulty
  user_id: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').insert(input)
  return { error }
}

export async function createTopics(inputs: {
  name: string
  subject_id: string
  difficulty: Difficulty
  user_id: string
}[]) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').insert(inputs)
  return { error }
}

export async function updateTopic(id: string, patch: { name: string; subject_id: string; difficulty: Difficulty }) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').update(patch).eq('id', id)
  return { error }
}

export async function markTopicStudied(id: string, patch: {
  first_studied_at: string
  last_revised_at: string
  revision_count: number
}) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').update(patch).eq('id', id)
  return { error }
}

export async function updateTopicAfterRevision(id: string, patch: { last_revised_at: string; revision_count: number }) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').update(patch).eq('id', id)
  return { error }
}

export async function deleteTopic(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('topics').delete().eq('id', id)
  return { error }
}
