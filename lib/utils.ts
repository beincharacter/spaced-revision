import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance, isToday, isPast, isFuture, addDays, differenceInDays, parseISO, startOfDay } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  const now = startOfDay(new Date())
  return formatDistance(d, now, { addSuffix: true })
}

export function isOverdue(date: string): boolean {
  const d = parseISO(date)
  return isPast(startOfDay(d)) && !isToday(d)
}

export function isDueToday(date: string): boolean {
  return isToday(parseISO(date))
}

export function isUpcoming(date: string): boolean {
  const d = parseISO(date)
  return isFuture(startOfDay(d)) && !isToday(d)
}

export function getDaysUntil(date: string): number {
  return differenceInDays(parseISO(date), startOfDay(new Date()))
}

export function estimateRevisionMinutes(count: number): number {
  return Math.round(count * 1.5)
}

export function getSubjectInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysToToday(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}
