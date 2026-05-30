'use client'
import { format, subDays, eachDayOfInterval, startOfDay, parseISO } from 'date-fns'
import { useState } from 'react'
import type { HeatmapEntry } from '@/types'

interface StudyHeatmapProps {
  data: HeatmapEntry[]
}

function getColor(count: number): string {
  if (count === 0) return 'bg-slate-100'
  if (count <= 2) return 'bg-indigo-200'
  if (count <= 4) return 'bg-indigo-400'
  if (count <= 6) return 'bg-indigo-500'
  return 'bg-indigo-700'
}

export function StudyHeatmap({ data }: StudyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null)

  const today = startOfDay(new Date())
  const start = subDays(today, 364)
  const days = eachDayOfInterval({ start, end: today })

  const countMap: Record<string, number> = {}
  data.forEach(({ date, count }) => { countMap[date] = count })

  // Pad to full weeks
  const startDow = start.getDay()
  const paddedDays = Array(startDow).fill(null).concat(days)

  // Group into weeks of 7
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7))
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="relative overflow-x-auto">
      {tooltip && (
        <div className="absolute z-10 bg-slate-900 text-white text-xs rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap top-0 left-1/2 -translate-x-1/2">
          {tooltip.count} revision{tooltip.count !== 1 ? 's' : ''} on {tooltip.date}
        </div>
      )}
      <div className="flex gap-1 min-w-max pt-4">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="w-3 h-3" />
              const dateStr = format(day, 'yyyy-MM-dd')
              const count = countMap[dateStr] || 0
              const isToday = dateStr === format(today, 'yyyy-MM-dd')
              return (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125 ${getColor(count)} ${isToday ? 'ring-1 ring-indigo-500' : ''}`}
                  onMouseEnter={() => setTooltip({ date: format(day, 'MMM d, yyyy'), count })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs text-slate-400">Less</span>
        {['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-700'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-slate-400">More</span>
      </div>
    </div>
  )
}
