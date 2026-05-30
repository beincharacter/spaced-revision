'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, SkipForward, AlertTriangle, Clock } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { Revision } from '@/types'

interface RevisionInboxProps {
  revisions: Revision[]
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  onNeedsPractice: (id: string) => void
  loading?: boolean
}

export function RevisionInbox({ revisions, onComplete, onSkip, onNeedsPractice, loading }: RevisionInboxProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">All caught up!</p>
        <p className="text-slate-400 text-sm mt-1">No revisions due in this category</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {revisions.map(rev => {
        const topic = rev.topic
        const subject = topic?.subject
        const isOverdue = new Date(rev.scheduled_date) < new Date(new Date().toDateString())

        return (
          <div
            key={rev.id}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
              isOverdue
                ? 'bg-rose-50 border-rose-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{topic?.name}</p>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Rev #{rev.revision_number}
                </Badge>
              </div>
              {subject && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-xs text-slate-500">{subject.name}</span>
                </div>
              )}
              <p className={`text-xs mt-1 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                {formatRelativeDate(rev.scheduled_date)}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon-sm"
                variant="success"
                title="Revised Well"
                onClick={() => onComplete(rev.id)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="warning"
                title="Needs Practice"
                onClick={() => onNeedsPractice(rev.id)}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Skip to tomorrow"
                onClick={() => onSkip(rev.id)}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
