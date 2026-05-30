export type Difficulty = 'easy' | 'medium' | 'hard'
export type RevisionStatus = 'pending' | 'completed' | 'skipped'

export interface Profile {
  id: string
  email: string
  name: string | null
  exam_name: string | null
  target_exam_date: string | null
  revision_intervals: number[] | null
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  topic_count?: number
  completed_count?: number
}

export interface Topic {
  id: string
  user_id: string
  subject_id: string
  name: string
  difficulty: Difficulty
  first_studied_at: string | null
  last_revised_at: string | null
  revision_count: number
  is_active: boolean
  created_at: string
  subject?: Subject
}

export type RevisionOutcome = 'well' | 'needs_practice' | null

export interface Revision {
  id: string
  user_id: string
  topic_id: string
  revision_number: number
  scheduled_date: string
  completed_at: string | null
  status: RevisionStatus
  outcome: RevisionOutcome
  google_event_id: string | null
  created_at: string
  topic?: Topic & { subject?: Subject }
}

export interface HeatmapEntry {
  date: string
  count: number
}

export const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#84cc16', '#f97316',
]

// Default fallback — used when the user has no custom cycle saved
export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 120, 180]

export interface RevisionCyclePreset {
  name: string
  description: string
  intervals: number[]
}

export const REVISION_CYCLE_PRESETS: RevisionCyclePreset[] = [
  {
    name: 'Standard',
    description: 'Recommended for most exams',
    intervals: [1, 3, 7, 15, 30, 60, 120, 180],
  },
  {
    name: 'Aggressive',
    description: 'More frequent early revisions — great for high-stakes exams',
    intervals: [1, 2, 4, 7, 14, 21, 30, 60],
  },
  {
    name: 'Relaxed',
    description: 'Wider gaps — good for long-term retention',
    intervals: [2, 7, 14, 30, 60, 90, 120, 180],
  },
  {
    name: 'Leitner 5-Box',
    description: 'Classic Leitner system adapted for topic-based revision',
    intervals: [1, 3, 7, 21, 60],
  },
]

export const EXAM_TEMPLATES: Record<string, { subjects: string[] }> = {
  'NEET PG': {
    subjects: ['Medicine', 'Surgery', 'Pharmacology', 'Pathology', 'Anatomy', 'Physiology', 'Biochemistry', 'Pediatrics', 'OBG', 'Radiology', 'Ophthalmology', 'ENT', 'Orthopedics', 'PSM'],
  },
  'NEET UG': {
    subjects: ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'],
  },
  'JEE': {
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
  },
  'UPSC': {
    subjects: ['History', 'Geography', 'Polity', 'Economy', 'Science & Technology', 'Environment', 'Current Affairs'],
  },
}
