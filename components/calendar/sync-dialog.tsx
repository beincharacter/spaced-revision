'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RefreshCw, Bell, CalendarDays, Clock } from 'lucide-react'

// reminderMinutes: -1 = no reminder, else minutes from midnight (e.g. 9*60 = 9:00 AM)
// timeZone: IANA string detected from the browser so the server creates events in the right timezone
export interface SyncOptions {
  reminderMinutes: number
  timeZone: string
}

interface SyncDialogProps {
  open: boolean
  onClose: () => void
  onSync: (opts: SyncOptions) => void
  loading?: boolean
  pendingCount?: number
}

const REMINDER_OPTIONS = [
  { label: 'No reminder',     minutes: -1 },
  { label: '7:00 AM',         minutes: 7 * 60 },
  { label: '8:00 AM',         minutes: 8 * 60 },
  { label: '9:00 AM',         minutes: 9 * 60 },
  { label: '10:00 AM',        minutes: 10 * 60 },
  { label: '12:00 PM (noon)', minutes: 12 * 60 },
  { label: '6:00 PM',         minutes: 18 * 60 },
  { label: 'Custom',          minutes: 0 },
]

function formatTime(minutes: number): string {
  if (minutes < 0) return 'No reminder'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
}

export function SyncDialog({ open, onClose, onSync, loading, pendingCount }: SyncDialogProps) {
  const [selected, setSelected] = useState(9 * 60)
  const [customH, setCustomH] = useState('09')
  const [customM, setCustomM] = useState('00')

  const isCustom = selected === 0

  function handleSync() {
    const reminderMinutes = selected === -1 ? -1
      : isCustom ? parseInt(customH) * 60 + parseInt(customM)
      : selected

    // Detect user's local timezone from the browser
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    onSync({ reminderMinutes, timeZone })
  }

  const previewTime = isCustom
    ? formatTime(parseInt(customH) * 60 + parseInt(customM))
    : formatTime(selected)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Sync to Google Calendar
          </DialogTitle>
          <DialogDescription>
            {pendingCount != null
              ? `${pendingCount} unsynced revision${pendingCount !== 1 ? 's' : ''} will be added as calendar events.`
              : 'Pending revisions will be added as calendar events.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Alert me at
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {REMINDER_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => setSelected(opt.minutes)}
                  className={`px-3 py-2 rounded-lg text-sm border text-left transition-colors ${
                    selected === opt.minutes
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {isCustom && (
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="number" min="0" max="23" value={customH}
                  onChange={e => setCustomH(e.target.value.padStart(2, '0'))}
                  className="w-14 h-9 rounded-lg border border-slate-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400 font-bold">:</span>
                <input
                  type="number" min="0" max="59" step="5" value={customM}
                  onChange={e => setCustomM(e.target.value.padStart(2, '0'))}
                  className="w-14 h-9 rounded-lg border border-slate-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-indigo-600">{previewTime}</span>
              </div>
            )}

            {selected !== -1 && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                A popup will appear at <strong>{previewTime}</strong> on each revision day
                in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSync} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Revisions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

