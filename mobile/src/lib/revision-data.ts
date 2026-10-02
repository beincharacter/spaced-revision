import { addDays, format } from 'date-fns';

import { supabase } from '@/lib/supabase';
import { getNeedsPracticeDate, getSkipDate, scheduleRevisions } from '@/lib/revision-cycle';
import { REVISION_INTERVALS, type Profile, type Revision, type Subject, type Topic } from '@/types';

export type SubjectWorkspace = {
  subjects: Subject[];
  topics: Topic[];
  revisions: Pick<Revision, 'id' | 'topic_id' | 'scheduled_date' | 'status'>[];
};

export function getTodayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatStudyDate(dateString: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('en', options).format(new Date(year, month - 1, day, 12));
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getDashboardData(userId: string) {
  const today = getTodayString();
  const throughDate = format(addDays(new Date(`${today}T12:00:00`), 7), 'yyyy-MM-dd');
  const [{ data: profile, error: profileError }, { data: revisions, error: revisionsError }, { count, error: countError }, { count: subjectCount, error: subjectError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('revisions').select('*, topic:topics(*, subject:subjects(*))').eq('user_id', userId).eq('status', 'pending').lte('scheduled_date', throughDate).order('scheduled_date').limit(100),
    supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed').eq('scheduled_date', today),
    supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (profileError) throw profileError;
  if (revisionsError) throw revisionsError;
  if (countError) throw countError;
  if (subjectError) throw subjectError;

  return {
    profile: profile as Profile | null,
    revisions: (revisions ?? []) as unknown as Revision[],
    completedToday: count ?? 0,
    subjectCount: subjectCount ?? 0,
  };
}

export async function getSubjectWorkspace(userId: string): Promise<SubjectWorkspace> {
  const [{ data: subjects, error: subjectError }, { data: topics, error: topicError }, { data: revisions, error: revisionError }] = await Promise.all([
    supabase.from('subjects').select('*').eq('user_id', userId).order('name'),
    supabase.from('topics').select('*, subject:subjects(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('revisions').select('id, topic_id, scheduled_date, status').eq('user_id', userId).eq('status', 'pending').order('scheduled_date'),
  ]);

  if (subjectError) throw subjectError;
  if (topicError) throw topicError;
  if (revisionError) throw revisionError;

  return {
    subjects: (subjects ?? []) as Subject[],
    topics: (topics ?? []) as unknown as Topic[],
    revisions: (revisions ?? []) as SubjectWorkspace['revisions'],
  };
}

export async function getCalendarRevisions(userId: string) {
  const startDate = getTodayString();
  const endDate = format(addDays(new Date(`${startDate}T12:00:00`), 45), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('revisions')
    .select('*, topic:topics(*, subject:subjects(*))')
    .eq('user_id', userId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  if (error) throw error;
  return (data ?? []) as unknown as Revision[];
}

export async function createSubject(userId: string, name: string, color: string) {
  const { data, error } = await supabase.from('subjects').insert({ user_id: userId, name: name.trim(), color }).select('*').single();
  if (error) throw error;
  return data as Subject;
}

export async function createTopic(userId: string, subjectId: string, name: string, difficulty: Topic['difficulty']) {
  const { data, error } = await supabase.from('topics').insert({
    user_id: userId,
    subject_id: subjectId,
    name: name.trim(),
    difficulty,
    is_active: true,
  }).select('*, subject:subjects(*)').single();

  if (error) throw error;
  return data as unknown as Topic;
}

export async function startTopicSchedule(userId: string, topic: Topic) {
  const [profile, { data: currentTopic, error: topicError }] = await Promise.all([
    getProfile(userId),
    supabase.from('topics').select('revision_count').eq('id', topic.id).eq('user_id', userId).single(),
  ]);
  if (topicError) throw topicError;

  const studiedAt = new Date();
  const intervals = profile?.revision_intervals?.length ? profile.revision_intervals : REVISION_INTERVALS;
  const scheduledRevisions = scheduleRevisions(studiedAt, intervals);
  const { error: updateError } = await supabase.from('topics').update({
    first_studied_at: studiedAt.toISOString(),
    last_revised_at: studiedAt.toISOString(),
    revision_count: (currentTopic.revision_count ?? 0) + 1,
  }).eq('id', topic.id).eq('user_id', userId);
  if (updateError) throw updateError;

  const { error: insertError } = await supabase.from('revisions').insert(
    scheduledRevisions.map((revision) => ({ ...revision, topic_id: topic.id, user_id: userId, status: 'pending' })),
  );
  if (insertError) throw insertError;
}

export async function markRevisionWell(userId: string, revision: Revision) {
  const completedAt = new Date().toISOString();
  const { error } = await supabase.from('revisions').update({
    status: 'completed',
    outcome: 'well',
    completed_at: completedAt,
  }).eq('id', revision.id).eq('user_id', userId);
  if (error) throw error;

  const { error: topicError } = await supabase.from('topics').update({
    last_revised_at: completedAt,
    revision_count: (revision.topic?.revision_count ?? 0) + 1,
  }).eq('id', revision.topic_id).eq('user_id', userId);
  if (topicError) throw topicError;
}

export async function markRevisionNeedsPractice(userId: string, revision: Revision) {
  const completedAt = new Date().toISOString();
  const { error } = await supabase.from('revisions').update({
    status: 'completed',
    outcome: 'needs_practice',
    completed_at: completedAt,
  }).eq('id', revision.id).eq('user_id', userId);
  if (error) throw error;

  const { error: topicError } = await supabase.from('topics').update({
    last_revised_at: completedAt,
    revision_count: (revision.topic?.revision_count ?? 0) + 1,
  }).eq('id', revision.topic_id).eq('user_id', userId);
  if (topicError) throw topicError;

  const { error: insertError } = await supabase.from('revisions').insert({
    user_id: userId,
    topic_id: revision.topic_id,
    revision_number: revision.revision_number,
    scheduled_date: getNeedsPracticeDate(),
    status: 'pending',
  });
  if (insertError) throw insertError;
}

export async function skipRevision(userId: string, revisionId: string) {
  const { error } = await supabase.from('revisions').update({ scheduled_date: getSkipDate() }).eq('id', revisionId).eq('user_id', userId);
  if (error) throw error;
}

export async function saveRevisionIntervals(userId: string, intervals: number[]) {
  const { error } = await supabase.from('profiles').update({ revision_intervals: intervals }).eq('id', userId);
  if (error) throw error;
}
