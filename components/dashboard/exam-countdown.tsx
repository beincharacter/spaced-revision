'use client'
import { getDaysUntil } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import Link from 'next/link'

interface ExamCountdownProps {
  examName: string | null
  targetDate: string | null
}

export function ExamCountdown({ examName, targetDate }: ExamCountdownProps) {
  if (!examName || !targetDate) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">No exam set</p>
          <p className="text-xs text-slate-400">Add your target exam date</p>
        </div>
        <Link
          href="/settings"
          className="text-xs text-indigo-600 font-medium hover:underline"
        >
          Set exam date →
        </Link>
      </div>
    )
  }

  const days = getDaysUntil(targetDate)

  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <div className="text-4xl font-bold text-indigo-600 tabular-nums">{Math.max(0, days)}</div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Days Remaining</p>
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 mt-1">
        <p className="text-sm font-semibold text-indigo-800">{examName}</p>
      </div>
    </div>
  )
}
