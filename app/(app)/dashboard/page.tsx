'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RevisionInbox } from '@/components/dashboard/revision-inbox'
import { DailyProgress } from '@/components/dashboard/daily-progress'
import { ExamCountdown } from '@/components/dashboard/exam-countdown'
import { SubjectProgress } from '@/components/dashboard/subject-progress'
import { StudyHeatmap } from '@/components/dashboard/study-heatmap'
import type { Revision, Profile, Subject, HeatmapEntry } from '@/types'
import { getNeedsPracticeDate, getSkipDate } from '@/lib/spaced-repetition'
import { getTodayString, addDaysToToday } from '@/lib/utils'
import { BookOpen, PlusCircle, Brain, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncDialog } from '@/components/calendar/sync-dialog'
import Link from 'next/link'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dueToday, setDueToday] = useState<Revision[]>([])
  const [overdue, setOverdue] = useState<Revision[]>([])
  const [upcoming, setUpcoming] = useState<Revision[]>([])
  const [completedToday, setCompletedToday] = useState(0)
  const [streak, setStreak] = useState(0)
  const [subjectProgress, setSubjectProgress] = useState<{ id: string; name: string; color: string; completed: number; total: number }[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)

  const today = getTodayString()
  const upcomingEnd = addDaysToToday(7)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [
      { data: profileData },
      { data: dueTodayData },
      { data: overdueData },
      { data: upcomingData },
      { data: completedData },
      { data: subjectsData },
      { data: heatmapData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').single(),
      supabase.from('revisions').select('*, topic:topics(*, subject:subjects(*))').eq('scheduled_date', today).eq('status', 'pending').order('created_at'),
      supabase.from('revisions').select('*, topic:topics(*, subject:subjects(*))').lt('scheduled_date', today).eq('status', 'pending').order('scheduled_date'),
      supabase.from('revisions').select('*, topic:topics(*, subject:subjects(*))').gt('scheduled_date', today).lte('scheduled_date', upcomingEnd).eq('status', 'pending').order('scheduled_date').limit(20),
      supabase.from('revisions').select('id', { count: 'exact' }).eq('scheduled_date', today).eq('status', 'completed'),
      supabase.from('subjects').select('id, name, color'),
      supabase.from('revisions').select('scheduled_date').eq('status', 'completed').gte('scheduled_date', format(addDays(new Date(), -364), 'yyyy-MM-dd')),
    ])

    if (profileData) {
      setProfile(profileData as Profile)
      setCalendarConnected(!!(profileData as { google_access_token?: string }).google_access_token)
    }
    if (dueTodayData) setDueToday(dueTodayData as unknown as Revision[])
    if (overdueData) setOverdue(overdueData as unknown as Revision[])
    if (upcomingData) setUpcoming(upcomingData as unknown as Revision[])
    if (completedData) setCompletedToday(completedData.length || 0)

    // Subject progress
    if (subjectsData) {
      const progressItems = await Promise.all(
        (subjectsData as Subject[]).map(async s => {
          const [{ count: total }, { count: completed }] = await Promise.all([
            supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('topic_id', s.id),
            supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          ])
          return { id: s.id, name: s.name, color: s.color, completed: completed || 0, total: total || 0 }
        })
      )
      setSubjectProgress(progressItems)
    }

    // Heatmap
    if (heatmapData) {
      const counts: Record<string, number> = {}
      heatmapData.forEach(({ scheduled_date }: { scheduled_date: string }) => {
        counts[scheduled_date] = (counts[scheduled_date] || 0) + 1
      })
      setHeatmap(Object.entries(counts).map(([date, count]) => ({ date, count })))
    }

    setLoading(false)
  }, [today, upcomingEnd])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleComplete(id: string) {
    const supabase = createClient()
    await supabase.from('revisions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    toast.success('Revision marked complete!')
    fetchData()
  }

  async function handleSkip(id: string) {
    const supabase = createClient()
    await supabase.from('revisions').update({ scheduled_date: getSkipDate() }).eq('id', id)
    toast.info('Revision moved to tomorrow')
    fetchData()
  }

  async function handleNeedsPractice(id: string) {
    const supabase = createClient()
    const rev = [...dueToday, ...overdue].find(r => r.id === id)
    if (!rev) return
    await supabase.from('revisions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('revisions').insert({
      user_id: rev.user_id,
      topic_id: rev.topic_id,
      revision_number: rev.revision_number,
      scheduled_date: getNeedsPracticeDate(),
      status: 'pending',
    })
    toast.warning('Extra revision scheduled in 2 days')
    fetchData()
  }

  async function handleCalendarSync({ reminderMinutes, timeZone }: { reminderMinutes: number; timeZone: string }) {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderMinutes, timeZone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setSyncDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const totalDue = dueToday.length + overdue.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {calendarConnected && (
            <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)} disabled={syncing}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/topics"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />Add Topic</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/revision"><Brain className="w-3.5 h-3.5 mr-1.5" />Start Session</Link>
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Due Today', value: dueToday.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Overdue', value: overdue.length, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Est. Time', value: `${Math.round(totalDue * 1.5)} min`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revision Inbox */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Revision Inbox
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="today">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="today" className="flex-1">
                    Due Today {dueToday.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{dueToday.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="overdue" className="flex-1">
                    Overdue {overdue.length > 0 && <span className="ml-1.5 bg-rose-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{overdue.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
                </TabsList>
                <TabsContent value="today">
                  <RevisionInbox revisions={dueToday} onComplete={handleComplete} onSkip={handleSkip} onNeedsPractice={handleNeedsPractice} loading={loading} />
                </TabsContent>
                <TabsContent value="overdue">
                  <RevisionInbox revisions={overdue} onComplete={handleComplete} onSkip={handleSkip} onNeedsPractice={handleNeedsPractice} loading={loading} />
                </TabsContent>
                <TabsContent value="upcoming">
                  <RevisionInbox revisions={upcoming} onComplete={handleComplete} onSkip={handleSkip} onNeedsPractice={handleNeedsPractice} loading={loading} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DailyProgress completed={completedToday} streak={streak} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Exam Countdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ExamCountdown examName={profile?.exam_name || null} targetDate={profile?.target_exam_date || null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">By Subject</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SubjectProgress subjects={subjectProgress} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Study Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <StudyHeatmap data={heatmap} />
        </CardContent>
      </Card>

      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSync={handleCalendarSync}
        loading={syncing}
      />
    </div>
  )
}
