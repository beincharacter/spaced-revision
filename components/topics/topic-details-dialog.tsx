'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 text-left pr-6 -mt-2">
          <div className="min-w-0">
            {subject && (
              <p className="text-base font-semibold truncate" style={{ color: subject.color }}>
                {subject.name}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onEdit} className="shrink-0 text-sm">
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
        </DialogHeader>
        <Separator />
        <div className="space-y-4">
          <DialogTitle>{topic.name}</DialogTitle>
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
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-40 overflow-y-auto">
                <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                  {topic.subtopics.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
