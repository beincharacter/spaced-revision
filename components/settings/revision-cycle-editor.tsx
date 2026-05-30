'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { REVISION_CYCLE_PRESETS, REVISION_INTERVALS } from '@/types'
import { Plus, X, RotateCcw } from 'lucide-react'

interface RevisionCycleEditorProps {
  value: number[]
  onChange: (intervals: number[]) => void
}

export function RevisionCycleEditor({ value, onChange }: RevisionCycleEditorProps) {
  const [addValue, setAddValue] = useState('')

  const intervals = [...value].sort((a, b) => a - b)

  function handleRemove(day: number) {
    onChange(intervals.filter(d => d !== day))
  }

  function handleAdd() {
    const n = parseInt(addValue)
    if (!n || n <= 0 || intervals.includes(n)) return
    onChange([...intervals, n].sort((a, b) => a - b))
    setAddValue('')
  }

  function handleEdit(oldDay: number, newVal: string) {
    const n = parseInt(newVal)
    if (!n || n <= 0) return
    const updated = intervals.map(d => (d === oldDay ? n : d)).sort((a, b) => a - b)
    onChange(updated)
  }

  const isDefault = JSON.stringify(intervals) === JSON.stringify(REVISION_INTERVALS)

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {REVISION_CYCLE_PRESETS.map(preset => {
            const isActive = JSON.stringify([...value].sort((a,b)=>a-b)) === JSON.stringify([...preset.intervals].sort((a,b)=>a-b))
            return (
              <button
                key={preset.name}
                onClick={() => onChange([...preset.intervals])}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className={`text-sm font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {preset.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{preset.description}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {preset.intervals.join(', ')} days
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Current cycle editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Cycle ({intervals.length} revisions)
          </p>
          {!isDefault && (
            <button
              onClick={() => onChange([...REVISION_INTERVALS])}
              className="text-xs text-indigo-600 flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />Reset to default
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {intervals.map(day => (
            <div
              key={day}
              className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 group"
            >
              <span className="text-xs text-slate-400">Day</span>
              <input
                type="number"
                min="1"
                defaultValue={day}
                onBlur={e => handleEdit(day, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEdit(day, (e.target as HTMLInputElement).value)}
                className="w-10 text-sm font-semibold text-indigo-700 bg-transparent text-center focus:outline-none"
              />
              <button
                onClick={() => handleRemove(day)}
                className="text-slate-300 hover:text-rose-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add new interval */}
          <div className="flex items-center gap-1 border border-dashed border-slate-300 rounded-lg px-2 py-1">
            <span className="text-xs text-slate-400">Day</span>
            <input
              type="number"
              min="1"
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="?"
              className="w-10 text-sm text-slate-500 bg-transparent text-center focus:outline-none placeholder:text-slate-300"
            />
            <button onClick={handleAdd} className="text-indigo-500 hover:text-indigo-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Click a day number to edit it. Changes apply to new revision schedules — existing ones are unaffected.
        </p>
      </div>
    </div>
  )
}
