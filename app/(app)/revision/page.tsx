'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Revision, Subject } from '@/types'
import { getSkipDate, getNeedsPracticeDate } from '@/lib/spaced-repetition'
import { getTodayString, formatDate } from '@/lib/utils'
import {
  CheckCircle2, AlertTriangle, SkipForward, Brain,
  PartyPopper, Clock, Search, ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({
  status,
  outcome,
  scheduledDate,
}: {
  status: string
  outcome?: string | null
  scheduledDate: string
}) {
  const today = getTodayString()

  if (status === 'completed') {
    if (outcome === 'well') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5">
          <CheckCircle2 className="w-3 h-3" />Revised Well
        </span>
      )
    }
    if (outcome === 'needs_practice') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5">
          <AlertTriangle className="w-3 h-3" />Needs Practice
        </span>
      )
    }
    // legacy rows without outcome
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5">
        <CheckCircle2 className="w-3 h-3" />Completed
      </span>
    )
  }
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5">
        <SkipForward className="w-3 h-3" />Skipped
      </span>
    )
  }
  if (scheduledDate < today) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full px-2.5 py-0.5">
        <AlertTriangle className="w-3 h-3" />Overdue
      </span>
    )
  }
  if (scheduledDate === today) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5">
        <Clock className="w-3 h-3" />Due Today
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5">
      <Clock className="w-3 h-3" />Upcoming
    </span>
  )
}

// ─── Revision History List ─────────────────────────────────────────────────────
function RevisionHistory({ refreshKey }: { refreshKey: number }) {
  const [all, setAll] = useState<Revision[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: revs }, { data: subs }] = await Promise.all([
      supabase
        .from('revisions')
        .select('*, topic:topics(name, revision_count, last_revised_at, subject:subjects(id, name, color))')
        .order('scheduled_date', { ascending: false })
        .limit(500),
      supabase.from('subjects').select('id, name, color').order('name'),
    ])
    if (revs) setAll(revs as unknown as Revision[])
    if (subs) setSubjects(subs as Subject[])
    setLoading(false)
  }, [])

  // refresh whenever the session tab completes revisions
  useEffect(() => { fetchAll() }, [fetchAll, refreshKey])

  async function markComplete(rev: Revision) {
    const supabase = createClient()
    await supabase.from('revisions').update({
      status: 'completed',
      outcome: 'well',
      completed_at: new Date().toISOString(),
    }).eq('id', rev.id)
    await supabase.from('topics').update({
      last_revised_at: new Date().toISOString(),
      revision_count: (rev.topic?.revision_count || 0) + 1,
    }).eq('id', rev.topic_id)
    toast.success('Marked as completed')
    fetchAll()
  }

  const today = getTodayString()

  const filtered = all.filter(r => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue' && !(r.status === 'pending' && r.scheduled_date < today)) return false
      if (statusFilter === 'due_today' && !(r.status === 'pending' && r.scheduled_date === today)) return false
      if (statusFilter === 'upcoming' && !(r.status === 'pending' && r.scheduled_date > today)) return false
      if (statusFilter === 'completed' && r.status !== 'completed') return false
      if (statusFilter === 'skipped' && r.status !== 'skipped') return false
    }
    if (subjectFilter !== 'all') {
      const subjectId = (r.topic?.subject as Subject | undefined)?.id
      if (subjectId !== subjectFilter) return false
    }
    if (search) {
      const topicName = r.topic?.name?.toLowerCase() || ''
      if (!topicName.includes(search.toLowerCase())) return false
    }
    return true
  })

  const counts = {
    all: all.length,
    overdue: all.filter(r => r.status === 'pending' && r.scheduled_date < today).length,
    due_today: all.filter(r => r.status === 'pending' && r.scheduled_date === today).length,
    upcoming: all.filter(r => r.status === 'pending' && r.scheduled_date > today).length,
    completed: all.filter(r => r.status === 'completed').length,
    skipped: all.filter(r => r.status === 'skipped').length,
  }

  const STATUS_TABS = [
    { value: 'all',       label: 'All',       count: counts.all },
    { value: 'overdue',   label: 'Overdue',   count: counts.overdue },
    { value: 'due_today', label: 'Due Today', count: counts.due_today },
    { value: 'upcoming',  label: 'Upcoming',  count: counts.upcoming },
    { value: 'completed', label: 'Completed', count: counts.completed },
    { value: 'skipped',   label: 'Skipped',   count: counts.skipped },
  ]

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 leading-none',
                statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Subject filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-45">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search topics…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No revisions found</p>
          <p className="text-slate-400 text-sm mt-1">Try changing the filters above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const topic = r.topic
            const subject = topic?.subject as Subject | undefined
            const isActionable = r.status === 'pending'
            const isOverdue = r.status === 'pending' && r.scheduled_date < today
            const isDueToday = r.status === 'pending' && r.scheduled_date === today

            return (
              <div
                key={r.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-colors',
                  isOverdue  && 'border-rose-200 bg-rose-50/40',
                  isDueToday && 'border-amber-200 bg-amber-50/40',
                  r.status === 'completed' && 'border-emerald-200 bg-emerald-50/30',
                  !isOverdue && !isDueToday && r.status === 'pending' && 'border-slate-200',
                  r.status === 'skipped' && 'border-slate-200 opacity-60',
                )}
              >
                {/* Subject dot */}
                {subject && (
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                )}

                {/* Topic + subject name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{topic?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {subject && <span className="text-xs text-slate-400">{subject.name}</span>}
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      Revision <strong>#{r.revision_number}</strong>
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-slate-500">{formatDate(r.scheduled_date)}</p>
                  {r.completed_at && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Done {format(parseISO(r.completed_at), 'MMM d')}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  <StatusBadge status={r.status} outcome={r.outcome} scheduledDate={r.scheduled_date} />
                </div>

                {/* Mark done (only for pending) */}
                {isActionable && (
                  <button
                    onClick={() => markComplete(r)}
                    title="Mark as completed"
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
          <p className="text-xs text-slate-400 text-center pt-2">{filtered.length} revision{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}

// ─── Session ───────────────────────────────────────────────────────────────────
function RevisionSession({ onComplete }: { onComplete: () => void }) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [total, setTotal] = useState(0)

  const today = getTodayString()

  const fetchRevisions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('revisions')
      .select('*, topic:topics(*, subject:subjects(*))')
      .lte('scheduled_date', today)
      .eq('status', 'pending')
      .order('scheduled_date')
      .limit(50)

    if (data && data.length > 0) {
      setRevisions(data as unknown as Revision[])
      setTotal(data.length)
      setIndex(0)
      setDone(false)
    } else {
      setDone(true)
    }
    setLoading(false)
  }, [today])

  useEffect(() => { fetchRevisions() }, [fetchRevisions])

  const current = revisions[index]

  function advance() {
    onComplete()   // notify page so History refreshes
    if (index + 1 >= revisions.length) setDone(true)
    else setIndex(i => i + 1)
  }

  async function handleComplete() {
    if (!current) return
    const supabase = createClient()
    await supabase.from('revisions').update({
      status: 'completed',
      outcome: 'well',
      completed_at: new Date().toISOString(),
    }).eq('id', current.id)
    await supabase.from('topics').update({
      last_revised_at: new Date().toISOString(),
      revision_count: (current.topic?.revision_count || 0) + 1,
    }).eq('id', current.topic_id)
    toast.success('Revised well — marked as completed!')
    advance()
  }

  async function handleNeedsPractice() {
    if (!current) return
    const supabase = createClient()
    await supabase.from('revisions').update({
      status: 'completed',
      outcome: 'needs_practice',
      completed_at: new Date().toISOString(),
    }).eq('id', current.id)
    await supabase.from('revisions').insert({
      user_id: current.user_id,
      topic_id: current.topic_id,
      revision_number: current.revision_number,
      scheduled_date: getNeedsPracticeDate(),
      status: 'pending',
    })
    toast.warning('Marked as needs practice — extra revision in 2 days')
    advance()
  }

  async function handleSkip() {
    if (!current) return
    const supabase = createClient()
    await supabase.from('revisions').update({ scheduled_date: getSkipDate() }).eq('id', current.id)
    toast.info('Moved to tomorrow')
    advance()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <PartyPopper className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Session Complete!</h2>
          <p className="text-slate-500">
            {total > 0
              ? `You reviewed ${total} topic${total !== 1 ? 's' : ''}. Great work!`
              : 'No revisions due right now. Come back later!'}
          </p>
        </div>
        <Button onClick={fetchRevisions} variant="outline">Check Again</Button>
      </div>
    )
  }

  if (!current) return null

  const topic = current.topic
  const subject = topic?.subject
  const completed = index
  const remaining = revisions.length - index

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{remaining} remaining</p>
        <div className="text-right">
          <p className="text-xl font-bold text-indigo-600">{completed}/{total}</p>
          <p className="text-xs text-slate-400">completed</p>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
        {subject && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
            <span className="text-sm font-medium text-slate-500">{subject.name}</span>
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">{topic?.name}</h2>
          <Badge variant="secondary">Revision #{current.revision_number}</Badge>
        </div>
        {topic?.last_revised_at && (
          <p className="text-sm text-slate-400">
            Last revised: {new Date(topic.last_revised_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Button variant="success" size="lg" className="flex-col h-auto py-4 gap-2" onClick={handleComplete}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Revised Well</span>
          </Button>
          <Button variant="warning" size="lg" className="flex-col h-auto py-4 gap-2" onClick={handleNeedsPractice}>
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs font-semibold">Needs Practice</span>
          </Button>
          <Button variant="outline" size="lg" className="flex-col h-auto py-4 gap-2" onClick={handleSkip}>
            <SkipForward className="w-5 h-5" />
            <span className="text-xs font-semibold">Skip</span>
          </Button>
        </div>
      </div>

      {revisions.length > index + 1 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Up Next</p>
          <div className="space-y-1.5">
            {revisions.slice(index + 1, index + 4).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                <span className="text-sm text-slate-600 flex-1 truncate">{r.topic?.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">#{r.revision_number}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RevisionPage() {
  // Incremented every time the session marks a revision — triggers History to refetch
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revisions</h1>
          <p className="text-slate-500 text-sm">Session mode or browse your full revision history</p>
        </div>
      </div>

      <Tabs defaultValue="session">
        <TabsList>
          <TabsTrigger value="session" className="gap-1.5">
            <Brain className="w-3.5 h-3.5" />Session
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="mt-6">
          <RevisionSession onComplete={() => setRefreshKey(k => k + 1)} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RevisionHistory refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

