'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Topic, Subject } from '@/types'
import { scheduleRevisions } from '@/lib/spaced-repetition'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TopicDialog } from '@/components/topics/topic-dialog'
import { BulkImportDialog } from '@/components/topics/bulk-import-dialog'
import { StudyDateDialog } from '@/components/topics/study-date-dialog'
import { Plus, Upload, Search, CheckCircle2, MoreVertical, Edit2, Trash2, FileText } from 'lucide-react'

const difficultyColors = { easy: 'success', medium: 'warning', hard: 'destructive' } as const

export default function TopicsPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>}>
      <TopicsPageInner />
    </Suspense>
  )
}

function TopicsPageInner() {
  const searchParams = useSearchParams()
  const defaultSubject = searchParams.get('subject') || ''

  const [topics, setTopics] = useState<Topic[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState(defaultSubject)
  const [topicDialogOpen, setTopicDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [editTopic, setEditTopic] = useState<Topic | null>(null)
  const [studyDialogTopic, setStudyDialogTopic] = useState<Topic | null>(null)
  const [studyLoading, setStudyLoading] = useState(false)
  const [userIntervals, setUserIntervals] = useState<number[] | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [{ data: topicsData }, { data: subjectsData }, { data: profileData }] = await Promise.all([
      supabase.from('topics').select('*, subject:subjects(*)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('revision_intervals').single(),
    ])
    if (topicsData) setTopics(topicsData as unknown as Topic[])
    if (subjectsData) setSubjects(subjectsData as Subject[])
    if (profileData) {
      const saved = (profileData as { revision_intervals?: number[] }).revision_intervals
      if (saved?.length) setUserIntervals(saved)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleMarkStudied(topic: Topic) {
    setStudyDialogTopic(topic)
  }

  async function confirmMarkStudied(studyDate: Date, chosenIntervals: number[]) {
    if (!studyDialogTopic) return
    setStudyLoading(true)
    const supabase = createClient()
    // Use intervals chosen in the dialog (already sorted/validated there)
    const revisions = scheduleRevisions(studyDate, chosenIntervals)

    await supabase.from('topics').update({
      first_studied_at: studyDate.toISOString(),
      last_revised_at: studyDate.toISOString(),
      revision_count: (studyDialogTopic.revision_count || 0) + 1,
    }).eq('id', studyDialogTopic.id)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStudyLoading(false); return }

    await supabase.from('revisions').insert(
      revisions.map(r => ({ ...r, topic_id: studyDialogTopic.id, user_id: user.id, status: 'pending' }))
    )

    toast.success(`${revisions.length} revisions scheduled for "${studyDialogTopic.name}"!`)
    setStudyLoading(false)
    setStudyDialogTopic(null)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this topic and all its revisions?')) return
    const supabase = createClient()
    await supabase.from('topics').delete().eq('id', id)
    toast.success('Topic deleted')
    fetchData()
  }

  const filtered = topics.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchSubject = !filterSubject || t.subject_id === filterSubject
    return matchSearch && matchSubject
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Topics</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} topic{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />Bulk Import
          </Button>
          <Button size="sm" onClick={() => { setEditTopic(null); setTopicDialogOpen(true) }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Topic
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search topics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterSubject || 'all'} onValueChange={v => setFilterSubject(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {topics.length === 0 ? 'No topics yet' : 'No topics match your search'}
          </h3>
          {topics.length === 0 && (
            <p className="text-slate-400 text-sm mb-6">Add topics you study to start scheduling revisions</p>
          )}
          {topics.length === 0 && (
            <Button onClick={() => { setEditTopic(null); setTopicDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-1.5" />Add First Topic
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(topic => {
            const subject = topic.subject as Subject
            const isStudied = !!topic.first_studied_at
            return (
              <Card key={topic.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{topic.name}</p>
                      {subject && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                          <span className="text-xs text-slate-500 truncate">{subject.name}</span>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditTopic(topic); setTopicDialogOpen(true) }}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(topic.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant={difficultyColors[topic.difficulty] || 'secondary'} className="capitalize text-xs">
                      {topic.difficulty}
                    </Badge>
                    {isStudied && (
                      <Badge variant="default" className="text-xs">
                        {topic.revision_count}× revised
                      </Badge>
                    )}
                  </div>

                  {isStudied ? (
                    <div className="text-xs text-slate-400">
                      Last revised {topic.last_revised_at ? formatDate(topic.last_revised_at) : 'never'}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="success"
                      className="w-full"
                      onClick={() => handleMarkStudied(topic)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Mark as Studied
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <TopicDialog
        open={topicDialogOpen}
        onClose={() => { setTopicDialogOpen(false); setEditTopic(null) }}
        topic={editTopic}
        subjects={subjects}
        defaultSubjectId={filterSubject}
        onSaved={fetchData}
      />
      <BulkImportDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        subjects={subjects}
        onImported={fetchData}
      />
      <StudyDateDialog
        open={!!studyDialogTopic}
        onClose={() => setStudyDialogTopic(null)}
        topicName={studyDialogTopic?.name || ''}
        subjectName={(studyDialogTopic?.subject as { name?: string })?.name}
        subjectColor={(studyDialogTopic?.subject as { color?: string })?.color}
        customIntervals={userIntervals}
        onConfirm={confirmMarkStudied}
        loading={studyLoading}
      />
    </div>
  )
}
