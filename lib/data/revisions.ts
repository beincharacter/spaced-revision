import { createClient } from '@/lib/supabase/client'
import type { Revision, RevisionOutcome, RevisionStatus } from '@/types'

type RevisionWithTopicSubject = Revision

export async function getDueTodayRevisions(today: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .eq('scheduled_date', today)
    .eq('status', 'pending')
    .order('created_at')
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

export async function getOverdueRevisions(today: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .lt('scheduled_date', today)
    .eq('status', 'pending')
    .order('scheduled_date')
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

export async function getUpcomingRevisions(today: string, until: string, limit = 20) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .gt('scheduled_date', today)
    .lte('scheduled_date', until)
    .eq('status', 'pending')
    .order('scheduled_date')
    .limit(limit)
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

export async function getCompletedTodayCount(today: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('id', { count: 'exact' })
    .eq('scheduled_date', today)
    .eq('status', 'completed')
  return data?.length || 0
}

export async function getRevisionCountsForTopic(topicId: string) {
  const supabase = createClient()
  const [{ count: total }, { count: completed }] = await Promise.all([
    supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
    supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ])
  return { total: total || 0, completed: completed || 0 }
}

export async function getCompletedDatesSince(sinceDate: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('scheduled_date')
    .eq('status', 'completed')
    .gte('scheduled_date', sinceDate)
  return (data || []).map(r => r.scheduled_date as string)
}

export async function getRevisionCountsForTopicIds(topicIds: string[]) {
  const supabase = createClient()
  if (topicIds.length === 0) return { total: 0, completed: 0 }
  const [{ count: total }, { count: completed }] = await Promise.all([
    supabase.from('revisions').select('id', { count: 'exact', head: true }).in('topic_id', topicIds),
    supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('status', 'completed').in('topic_id', topicIds),
  ])
  return { total: total || 0, completed: completed || 0 }
}

export async function markRevisionComplete(id: string, outcome?: RevisionOutcome) {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status: 'completed' as RevisionStatus, completed_at: new Date().toISOString() }
  if (outcome !== undefined) patch.outcome = outcome
  const { error } = await supabase.from('revisions').update(patch).eq('id', id)
  return { error }
}

export async function rescheduleRevision(id: string, newDate: string) {
  const supabase = createClient()
  const { error } = await supabase.from('revisions').update({ scheduled_date: newDate }).eq('id', id)
  return { error }
}

export async function createRevision(input: {
  user_id: string
  topic_id: string
  revision_number: number
  scheduled_date: string
  status: RevisionStatus
}) {
  const supabase = createClient()
  const { error } = await supabase.from('revisions').insert(input)
  return { error }
}

export async function createRevisions(inputs: {
  user_id: string
  topic_id: string
  revision_number: number
  scheduled_date: string
  status: RevisionStatus
}[]) {
  const supabase = createClient()
  const { error } = await supabase.from('revisions').insert(inputs)
  return { error }
}

// ─── Revision history (filterable list) ────────────────────────────────────
export async function listRevisionHistory(limit = 500) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(name, revision_count, last_revised_at, subject:subjects(id, name, color))')
    .order('scheduled_date', { ascending: true })
    .limit(limit)
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

// ─── Session mode (due-or-overdue queue) ───────────────────────────────────
export async function getSessionQueue(today: string, limit = 50) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .lte('scheduled_date', today)
    .eq('status', 'pending')
    .order('scheduled_date')
    .limit(limit)
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

// ─── Calendar month view ────────────────────────────────────────────────────
export async function getRevisionsInRange(startDate: string, endDate: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date')
  return (data as unknown as RevisionWithTopicSubject[]) || []
}

export async function getUnsyncedPendingCount() {
  const supabase = createClient()
  const { count } = await supabase
    .from('revisions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .is('google_event_id', null)
  return count || 0
}

export async function getMaxScheduledDate() {
  const supabase = createClient()
  const { data } = await supabase
    .from('revisions')
    .select('scheduled_date')
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.scheduled_date ? new Date(data.scheduled_date) : null
}

export async function deleteRevision(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('revisions').delete().eq('id', id)
  return { error }
}
