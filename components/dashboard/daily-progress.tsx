'use client'
import { Flame, CheckCircle2 } from 'lucide-react'

interface DailyProgressProps {
  completed: number
  streak: number
}

export function DailyProgress({ completed, streak }: DailyProgressProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl font-bold text-indigo-600 tabular-nums">{completed}</span>
        <div className="flex items-center gap-1.5 text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-sm">revisions today</span>
        </div>
      </div>

      {streak > 0 ? (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-700">{streak} day streak</span>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Complete a revision to start your streak!</p>
      )}
    </div>
  )
}
