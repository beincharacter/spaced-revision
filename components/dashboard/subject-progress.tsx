'use client'
import { Progress } from '@/components/ui/progress'
import { getSubjectInitials } from '@/lib/utils'

interface SubjectProgressItem {
  id: string
  name: string
  color: string
  completed: number
  total: number
}

interface SubjectProgressProps {
  subjects: SubjectProgressItem[]
}

export function SubjectProgress({ subjects }: SubjectProgressProps) {
  if (subjects.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">No subjects yet</p>
    )
  }

  return (
    <div className="space-y-3">
      {subjects.map(s => {
        const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
        return (
          <div key={s.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: s.color }}
                >
                  {getSubjectInitials(s.name)}
                </div>
                <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{s.name}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )
      })}
    </div>
  )
}
