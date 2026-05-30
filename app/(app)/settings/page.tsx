'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { EXAM_TEMPLATES, REVISION_INTERVALS } from '@/types'
import { User, Target, AlertTriangle, Save, Calendar, CheckCircle2, RefreshCw, Unlink, Repeat2 } from 'lucide-react'
import { Suspense } from 'react'
import { RevisionCycleEditor } from '@/components/settings/revision-cycle-editor'
import { SyncDialog } from '@/components/calendar/sync-dialog'

function SettingsPageInner() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Partial<Profile> & {
    google_access_token?: string | null
    google_refresh_token?: string | null
  }>({})
  const [intervals, setIntervals] = useState<number[]>(REVISION_INTERVALS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)

  useEffect(() => {
    const gcalParam = searchParams.get('gcal')
    const reason = searchParams.get('reason')
    if (gcalParam === 'connected') toast.success('Google Calendar connected!')
    if (gcalParam === 'missing_config') toast.error('Google OAuth credentials missing — check .env.local')
    if (gcalParam === 'error') {
      const msg: Record<string, string> = {
        invalid_client: 'Invalid client secret — check GOOGLE_CLIENT_SECRET in .env.local',
        redirect_uri_mismatch: 'Redirect URI mismatch — add http://localhost:3000/api/google/callback in Google Cloud Console',
        access_denied: 'Access denied — you cancelled the Google permission screen',
      }
      toast.error(msg[reason || ''] || `Connection failed${reason ? `: ${reason}` : ''}`)
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('*').single()
      if (data) {
        setProfile(data as typeof profile)
        // Load saved custom intervals, fall back to default
        const saved = (data as { revision_intervals?: number[] }).revision_intervals
        if (saved?.length) setIntervals(saved)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const isCalendarConnected = !!profile.google_access_token

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({
      name: profile.name,
      exam_name: profile.exam_name,
      target_exam_date: profile.target_exam_date || null,
      revision_intervals: intervals,
    }).eq('id', user?.id || '')
    setSaving(false)
    if (error) toast.error('Failed to save settings')
    else toast.success('Settings saved!')
  }

  function handleConnectCalendar() {
    window.location.href = '/api/google/connect'
  }

  async function handleDisconnectCalendar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    }).eq('id', user.id)
    setProfile(p => ({ ...p, google_access_token: null, google_refresh_token: null }))
    toast.success('Google Calendar disconnected')
  }

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleResetData() {
    if (!confirm('This will permanently delete all your subjects, topics, and revisions. Are you sure?')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([
      supabase.from('revisions').delete().eq('user_id', user.id),
      supabase.from('topics').delete().eq('user_id', user.id),
      supabase.from('subjects').delete().eq('user_id', user.id),
    ])
    toast.success('All data deleted')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-indigo-600" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={profile.name || ''}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email || ''} disabled className="bg-slate-50" />
          </div>
        </CardContent>
      </Card>

      {/* Exam */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-indigo-600" />
            Exam Goal
          </CardTitle>
          <CardDescription>Set your target exam for the countdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Exam</Label>
            <Select value={profile.exam_name || ''} onValueChange={v => setProfile(p => ({ ...p, exam_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent>
                {Object.keys(EXAM_TEMPLATES).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {profile.exam_name === 'Other' && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-exam">Custom Exam Name</Label>
              <Input id="custom-exam" placeholder="e.g. CA Final, Bar Exam..."
                onChange={e => setProfile(p => ({ ...p, exam_name: e.target.value }))} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="target-date">Target Exam Date</Label>
            <Input id="target-date" type="date" value={profile.target_exam_date || ''}
              onChange={e => setProfile(p => ({ ...p, target_exam_date: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Revision Cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat2 className="w-4 h-4 text-indigo-600" />
            Revision Cycle
          </CardTitle>
          <CardDescription>
            Choose how many days after studying a topic you want to be reminded to revise it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevisionCycleEditor value={intervals} onChange={setIntervals} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>

      <Separator />

      {/* Google Calendar */}
      <Card className={isCalendarConnected ? 'border-emerald-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className={`w-4 h-4 ${isCalendarConnected ? 'text-emerald-600' : 'text-indigo-600'}`} />
            Google Calendar
          </CardTitle>
          <CardDescription>Sync your revision schedule directly to Google Calendar for notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCalendarConnected ? (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Google Calendar connected — revisions will appear as all-day events</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setSyncDialogOpen(true)} disabled={syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Revisions to Calendar'}
                </Button>
                <Button onClick={handleDisconnectCalendar} variant="outline" className="text-slate-500">
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />Disconnect
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Only unsynced (new) revisions are added. You choose the reminder time in the sync dialog.
              </p>
            </>
          ) : (
            <>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">What you get:</p>
                <ul className="space-y-1 text-sm text-slate-500">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />All-day revision events on Google Calendar</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Customisable reminder time (picked at sync)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Events show topic, subject, and revision number</li>
                </ul>
              </div>
              <Button onClick={handleConnectCalendar}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Calendar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-rose-700">
            <AlertTriangle className="w-4 h-4" />Danger Zone
          </CardTitle>
          <CardDescription>These actions are irreversible</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Reset All Data</p>
              <p className="text-xs text-slate-500">Delete all subjects, topics, and revisions</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleResetData}>Reset Data</Button>
          </div>
        </CardContent>
      </Card>

      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSync={handleSync}
        loading={syncing}
      />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}</div>}>
      <SettingsPageInner />
    </Suspense>
  )
}
