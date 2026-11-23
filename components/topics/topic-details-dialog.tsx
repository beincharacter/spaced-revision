'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Topic, Subject } from '@/types'
import { formatDate } from '@/lib/utils'
import { Edit2 } from 'lucide-react'

interface TopicDetailsDialogProps {
  open: boolean
  onClose: () => void
  topic: Topic | null
  onEdit: () => void
}

export function TopicDetailsDialog({ open, onClose, topic, onEdit }: TopicDetailsDialogProps) {
  if (!topic) return null
  const subject = topic.subject as Subject | undefined
  const isStudied = !!topic.first_studied_at

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {subject && (
            <Badge
              className="w-fit mb-1 text-xs text-white border-0"
              style={{ backgroundColor: subject.color }}
            >
              {subject.name}
            </Badge>
          )}
          <DialogTitle>{topic.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <p className="font-medium text-slate-700">{isStudied ? 'Studied' : 'Not studied yet'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Times revised</p>
              <p className="font-medium text-slate-700">{topic.revision_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">First studied</p>
              <p className="font-medium text-slate-700">{topic.first_studied_at ? formatDate(topic.first_studied_at) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Last revised</p>
              <p className="font-medium text-slate-700">{topic.last_revised_at ? formatDate(topic.last_revised_at) : '—'}</p>
            </div>
          </div>

          {topic.subtopics && topic.subtopics.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">Subtopics</p>
              <div className="flex flex-wrap gap-1.5">
                {topic.subtopics.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
