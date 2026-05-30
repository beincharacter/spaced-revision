'use client'
import { useState } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { REVISION_INTERVALS, REVISION_CYCLE_PRESETS } from '@/types'
import { CalendarDays, CheckCircle2, Repeat2, ChevronDown, ChevronUp, Plus, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudyDateDialogProps {
  open: boolean
  onClose: () => void
  topicName: string
  subjectName?: string
  subjectColor?: string
  customIntervals?: number[] | null
  onConfirm: (studyDate: Date, intervals: number[]) => void
  loading?: boolean
}

export function StudyDateDialog({
  open, onClose, topicName, subjectName, subjectColor, customIntervals, onConfirm, loading
}: StudyDateDialogProps) {
  const defaultIntervals = customIntervals?.length ? customIntervals : REVISION_INTERVALS
  const [studyDate, setStudyDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [intervals, setIntervals] = useState<number[]>(defaultIntervals)
  const [cycleOpen, setCycleOpen] = useState(false)
  const [addValue, setAddValue] = useState('')

  const parsedDate = parseISO(studyDate)
  const sorted = [...intervals].sort((a, b) => a - b)
  const revisionDates = sorted.map((days, i) => ({
    number: i + 1, days, date: addDays(parsedDate, days),
  }))

  function handleRemoveDay(day: number) {
    setIntervals(sorted.filter(d => d !== day))
  }

  function handleEditDay(oldDay: number, newVal: string) {
    const n = parseInt(newVal)
    if (!n || n <= 0) return
    setIntervals(sorted.map(d => d === oldDay ? n : d).sort((a, b) => a - b))
  }

  function handleAddDay() {
    const n = parseInt(addValue)
    if (!n || n <= 0 || sorted.includes(n)) return
    setIntervals([...sorted, n].sort((a, b) => a - b))
    setAddValue('')
  }

  function handlePreset(presetIntervals: number[]) {
    setIntervals([...presetIntervals])
  }

  const isDefault = JSON.stringify(sorted) === JSON.stringify(REVISION_INTERVALS)

  function handleConfirm() {
    onConfirm(parsedDate, sorted)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Revisions</DialogTitle>
          <DialogDescription>
            Set the study date and customise the revision cycle for this topic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Topic info */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
            {subjectColor && (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
            )}
            <div>
              <p className="font-semibold text-slate-900 text-sm">{topicName}</p>
              {subjectName && <p className="text-xs text-slate-500">{subjectName}</p>}
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label htmlFor="study-date" className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Study Date
            </Label>
            <input
              id="study-date"
              type="date"
              value={studyDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setStudyDate(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            />
            <p className="text-xs text-slate-400">Revisions are calculated from this date</p>
          </div>

          {/* Cycle editor — collapsible */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCycleOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">Revision Cycle</span>
                <span className="text-xs text-slate-400">
                  {sorted.length} revision{sorted.length !== 1 ? 's' : ''} · Days: {sorted.join(', ')}
                </span>
              </div>
              {cycleOpen
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {cycleOpen && (
              <div className="px-4 py-4 space-y-4 border-t border-slate-200 bg-white">
                {/* Presets */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Presets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REVISION_CYCLE_PRESETS.map(preset => {
                      const active = JSON.stringify(sorted) === JSON.stringify([...preset.intervals].sort((a,b)=>a-b))
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handlePreset(preset.intervals)}
                          className={cn(
                            'p-2.5 rounded-lg border text-left transition-colors',
                            active ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          <p className={cn('text-xs font-semibold', active ? 'text-indigo-700' : 'text-slate-700')}>
                            {preset.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{preset.intervals.join(', ')} days</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Editable chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Custom ({sorted.length} revisions)
                    </p>
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => setIntervals([...REVISION_INTERVALS])}
                        className="text-xs text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sorted.map(day => (
                      <div key={day} className="flex items-center gap-0.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-400">Day</span>
                        <input
                          type="number"
                          min="1"
                          defaultValue={day}
                          onBlur={e => handleEditDay(day, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleEditDay(day, (e.target as HTMLInputElement).value)}
                          className="w-8 text-xs font-semibold text-indigo-700 bg-transparent text-center focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(day)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-0.5 border border-dashed border-slate-300 rounded-lg px-2 py-1">
                      <span className="text-[10px] text-slate-400">Day</span>
                      <input
                        type="number"
                        min="1"
                        value={addValue}
                        onChange={e => setAddValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddDay()}
                        placeholder="?"
                        className="w-8 text-xs text-slate-500 bg-transparent text-center focus:outline-none placeholder:text-slate-300"
                      />
                      <button type="button" onClick={handleAddDay} className="text-indigo-500 hover:text-indigo-700">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Schedule Preview — {sorted.length} revision{sorted.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {revisionDates.map(({ number, days, date }) => (
                <div
                  key={number}
                  className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">#{number}</Badge>
                    <span className="text-xs text-slate-500">+{days}d</span>
                  </div>
                  <span className="text-xs font-medium text-indigo-700">{format(date, 'MMM d')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading || !studyDate || sorted.length === 0}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Scheduling...' : `Schedule ${sorted.length} Revisions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

