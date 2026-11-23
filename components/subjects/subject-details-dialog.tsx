'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getSubjectInitials } from '@/lib/utils'
import { Edit2 } from 'lucide-react'

interface SubjectDetailsDialogProps {
  open: boolean
  onClose: () => void
  subject: { id: string; name: string; color: string; topic_count: number; revision_count: number; completed_count: number } | null
  onEdit: () => void
}

export function SubjectDetailsDialog({ open, onClose, subject, onEdit }: SubjectDetailsDialogProps) {
  if (!subject) return null
  const pct = subject.revision_count > 0 ? Math.round((subject.completed_count / subject.revision_count) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: subject.color }}
            >
              {getSubjectInitials(subject.name)}
            </div>
            <DialogTitle>{subject.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Topics</p>
              <p className="font-medium text-slate-700">{subject.topic_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Revisions</p>
              <p className="font-medium text-slate-700">{subject.completed_count} / {subject.revision_count} completed</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Completion</span>
              <span className="font-semibold text-slate-700">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
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
