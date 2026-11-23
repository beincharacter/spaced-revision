'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import type { CustomEvent } from '@/types'

interface EventDialogProps {
  open: boolean
  onClose: () => void
  defaultDate: Date
  event?: CustomEvent | null
  onSave: (input: { title: string; event_date: string; notes: string }) => void
  loading?: boolean
}

export function EventDialog({ open, onClose, defaultDate, event, onSave, loading }: EventDialogProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title)
        setDate(event.event_date)
        setNotes(event.notes || '')
      } else {
        setTitle('')
        const defaultStr = format(defaultDate, 'yyyy-MM-dd')
        setDate(defaultStr < todayStr ? todayStr : defaultStr)
        setNotes('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate, event])

  const isPastDate = date < todayStr

  function handleSave() {
    if (!title.trim() || !date || isPastDate) return
    onSave({ title: title.trim(), event_date: date, notes: notes.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Add Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g. Mock Test, Unit Exam..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              min={todayStr}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            {isPastDate && (
              <p className="text-xs text-rose-500">Date can&apos;t be in the past</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-notes">Notes (optional)</Label>
            <Textarea
              id="event-notes"
              placeholder="Any extra details..."
              className="min-h-[80px]"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !title.trim() || !date || isPastDate}>
            {loading ? 'Saving...' : event ? 'Save Changes' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
