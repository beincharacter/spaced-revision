'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
  addMonths, subMonths,
} from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SyncDialog } from '@/components/calendar/sync-dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Revision } from '@/types'
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingUnsyncedCount, setPendingUnsyncedCount] = useState(0)
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null)
  const [maxRevisionDate, setMaxRevisionDate] = useState<Date | null>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function fetchMaxRevisionDate() {
      const supabase = createClient()
      const { data } = await supabase
        .from('revisions')
        .select('scheduled_date')
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data?.scheduled_date) setMaxRevisionDate(new Date(data.scheduled_date))
    }
    fetchMaxRevisionDate()
  }, [])

  const fetchRevisions = useCallback(async () => {
    const supabase = createClient()
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    const [{ data }, { data: profile }] = await Promise.all([
      supabase
        .from('revisions')
        .select('*, topic:topics(*, subject:subjects(*))')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date'),
      supabase.from('profiles').select('google_access_token, created_at').single(),
    ])

    if (data) setRevisions(data as unknown as Revision[])
    const connected = !!(profile as { google_access_token?: string })?.google_access_token
    setCalendarConnected(connected)
    const createdAt = (profile as { created_at?: string })?.created_at
    if (createdAt) setAccountCreatedAt(new Date(createdAt))

    if (connected) {
      const { count } = await supabase
        .from('revisions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('google_event_id', null)
      setPendingUnsyncedCount(count || 0)
    }

    setLoading(false)
  }, [currentMonth])

  useEffect(() => { fetchRevisions() }, [fetchRevisions])

  async function handleSync({ reminderMinutes, timeZone }: { reminderMinutes: number; timeZone: string }) {
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
      fetchRevisions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDeleteRevision(revision: Revision) {
    setDeletingId(revision.id)
    try {
      const res = await fetch('/api/calendar/delete-event', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId: revision.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(
        revision.google_event_id
          ? 'Deleted from ReviseFlow and Google Calendar'
          : 'Revision deleted'
      )
      fetchRevisions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const revsByDate: Record<string, Revision[]> = {}
  revisions.forEach(r => {
    if (!revsByDate[r.scheduled_date]) revsByDate[r.scheduled_date] = []
    revsByDate[r.scheduled_date].push(r)
  })

  const selectedRevisions = selectedDay
    ? revisions.filter(r => r.scheduled_date === format(selectedDay, 'yyyy-MM-dd'))
    : []

  const today = format(new Date(), 'yyyy-MM-dd')
  const now = new Date()
  const currentActualYear = now.getFullYear()
  const accountCreatedYear = accountCreatedAt ? accountCreatedAt.getFullYear() : currentActualYear
  const maxAllowedDate = maxRevisionDate && maxRevisionDate > now
    ? new Date(maxRevisionDate.getFullYear(), maxRevisionDate.getMonth(), 1)
    : new Date(currentActualYear, now.getMonth(), 1)
  const maxAllowedYear = Math.max(currentActualYear, maxAllowedDate.getFullYear())
  const showYearSelect = accountCreatedYear !== maxAllowedYear
  const years: number[] = []
  for (let y = maxAllowedYear; y >= accountCreatedYear; y--) years.push(y)

  function isMonthDisabled(year: number, monthIdx: number) {
    const monthDate = new Date(year, monthIdx, 1)
    const minDate = accountCreatedAt
      ? new Date(accountCreatedAt.getFullYear(), accountCreatedAt.getMonth(), 1)
      : maxAllowedDate
    return monthDate > maxAllowedDate || monthDate < minDate
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">{revisions.length} revisions this month</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {calendarConnected && (
            <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Sync{pendingUnsyncedCount > 0 ? ` (${pendingUnsyncedCount} pending)` : ''}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            disabled={isMonthDisabled(subMonths(currentMonth, 1).getFullYear(), subMonths(currentMonth, 1).getMonth())}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover open={monthPickerOpen} onOpenChange={v => { setMonthPickerOpen(v); if (v) setPickerYear(currentMonth.getFullYear()) }}>
            <PopoverTrigger asChild>
              <button className="text-sm font-semibold text-slate-700 w-32 text-center hover:text-indigo-600 transition-colors">
                {format(currentMonth, 'MMMM yyyy')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="center">
              {showYearSelect && (
                <Select value={String(pickerYear)} onValueChange={v => setPickerYear(Number(v))}>
                  <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, idx) => {
                  const disabled = isMonthDisabled(pickerYear, idx)
                  const active = pickerYear === currentMonth.getFullYear() && idx === currentMonth.getMonth()
                  return (
                    <button
                      key={name}
                      disabled={disabled}
                      onClick={() => {
                        setCurrentMonth(new Date(pickerYear, idx, 1))
                        setMonthPickerOpen(false)
                      }}
                      className={cn(
                        'text-xs font-medium rounded-md py-1.5 transition-colors',
                        disabled && 'opacity-30 cursor-not-allowed',
                        !disabled && active && 'bg-indigo-600 text-white',
                        !disabled && !active && 'hover:bg-slate-100 text-slate-700',
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            disabled={isMonthDisabled(addMonths(currentMonth, 1).getFullYear(), addMonths(currentMonth, 1).getMonth())}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayRevs = revsByDate[dateStr] || []
                  const isCurrentDay = isToday(day)
                  const inMonth = isSameMonth(day, currentMonth)
                  const selected = selectedDay && isSameDay(day, selectedDay)
                  const hasOverdue = dayRevs.some(r => r.status === 'pending' && r.scheduled_date < today)
                  const pending = dayRevs.filter(r => r.status === 'pending').length
                  const done = dayRevs.filter(r => r.status === 'completed').length
                  const synced = dayRevs.some(r => r.google_event_id)

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'min-h-[64px] p-1.5 rounded-lg text-left transition-colors',
                        !inMonth && 'opacity-30',
                        isCurrentDay && 'ring-2 ring-indigo-500',
                        selected && 'bg-indigo-50',
                        !selected && inMonth && 'hover:bg-slate-50',
                      )}
                    >
                      <span className={cn('text-xs font-medium block mb-1', isCurrentDay ? 'text-indigo-600 font-bold' : 'text-slate-600')}>
                        {format(day, 'd')}
                      </span>
                      {pending > 0 && (
                        <div className={cn('text-[10px] font-semibold rounded px-1 py-0.5 mb-0.5 flex items-center gap-0.5', hasOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                          {pending}
                          {synced && calendarConnected && <span className="text-[8px]">📅</span>}
                        </div>
                      )}
                      {done > 0 && (
                        <div className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded px-1 py-0.5">
                          {done}✓
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day detail */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                {selectedDay ? format(selectedDay, 'MMMM d, yyyy') : 'Select a day'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!selectedDay ? (
                <p className="text-sm text-slate-400">Click a day to see revisions</p>
              ) : selectedRevisions.length === 0 ? (
                <p className="text-sm text-slate-400">No revisions on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedRevisions.map(r => {
                    const topic = r.topic
                    const subject = topic?.subject
                    const isDeleting = deletingId === r.id

                    return (
                      <div
                        key={r.id}
                        className={cn(
                          'flex items-start gap-2 p-2 rounded-lg border text-sm transition-opacity',
                          isDeleting && 'opacity-50',
                          r.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                          r.scheduled_date < today ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
                        )}
                      >
                        {subject && (
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: subject.color }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{topic?.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {subject && <span className="text-xs text-slate-400">{subject.name}</span>}
                            <Badge variant="secondary" className="text-[10px] py-0">#{r.revision_number}</Badge>
                            {r.status === 'completed' && <Badge variant="success" className="text-[10px] py-0">Done</Badge>}
                            {r.google_event_id && (
                              <span className="text-[10px] text-indigo-500 font-medium flex items-center gap-0.5">
                                📅 synced
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRevision(r)}
                          disabled={isDeleting}
                          title={r.google_event_id ? 'Delete from ReviseFlow & Google Calendar' : 'Delete revision'}
                          className="shrink-0 p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSync={handleSync}
        loading={syncing}
        pendingCount={pendingUnsyncedCount}
      />
    </div>
  )
}

