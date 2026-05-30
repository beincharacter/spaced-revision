import { addDays, format } from 'date-fns'
import { REVISION_INTERVALS } from '@/types'

export function scheduleRevisions(
  studiedAt: Date,
  customIntervals?: number[] | null
): { revision_number: number; scheduled_date: string }[] {
  const intervals = customIntervals?.length ? customIntervals : REVISION_INTERVALS
  return intervals.map((days, idx) => ({
    revision_number: idx + 1,
    scheduled_date: format(addDays(studiedAt, days), 'yyyy-MM-dd'),
  }))
}

export function getSkipDate(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

export function getNeedsPracticeDate(): string {
  return format(addDays(new Date(), 2), 'yyyy-MM-dd')
}
