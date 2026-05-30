'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Subject } from '@/types'
import { getSubjectInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SubjectDialog } from '@/components/subjects/subject-dialog'
import { Plus, MoreVertical, Edit2, Trash2, BookOpen, FileText } from 'lucide-react'
import Link from 'next/link'

interface SubjectWithStats extends Subject {
  topic_count: number
  revision_count: number
  completed_count: number
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)

  async function fetchSubjects() {
    const supabase = createClient()
    const { data } = await supabase.from('subjects').select('*').order('created_at')
    if (!data) { setLoading(false); return }

    const enriched = await Promise.all(
      data.map(async (s: Subject) => {
        const [{ count: topic_count }, { count: revision_count }, { count: completed_count }] = await Promise.all([
          supabase.from('topics').select('id', { count: 'exact', head: true }).eq('subject_id', s.id),
          supabase.from('revisions').select('id', { count: 'exact', head: true }).in('topic_id',
            (await supabase.from('topics').select('id').eq('subject_id', s.id)).data?.map((t: { id: string }) => t.id) || []
          ),
          supabase.from('revisions').select('id', { count: 'exact', head: true }).eq('status', 'completed').in('topic_id',
            (await supabase.from('topics').select('id').eq('subject_id', s.id)).data?.map((t: { id: string }) => t.id) || []
          ),
        ])
        return { ...s, topic_count: topic_count || 0, revision_count: revision_count || 0, completed_count: completed_count || 0 }
      })
    )
    setSubjects(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchSubjects() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this subject and all its topics?')) return
    const supabase = createClient()
    await supabase.from('subjects').delete().eq('id', id)
    toast.success('Subject deleted')
    fetchSubjects()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
          <p className="text-slate-500 text-sm mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditSubject(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1.5" />Add Subject
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No subjects yet</h3>
          <p className="text-slate-400 text-sm mb-6">Create subjects to organise your topics</p>
          <Button onClick={() => { setEditSubject(null); setDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1.5" />Create First Subject
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => {
            const pct = s.revision_count > 0 ? Math.round((s.completed_count / s.revision_count) * 100) : 0
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: s.color }}
                      >
                        {getSubjectInitials(s.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{s.name}</h3>
                        <p className="text-xs text-slate-500">{s.topic_count} topic{s.topic_count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditSubject(s); setDialogOpen(true) }}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Completion</span>
                      <span className="font-semibold text-slate-700">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>

                  <Link
                    href={`/topics?subject=${s.id}`}
                    className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />View Topics
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SubjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        subject={editSubject}
        onSaved={fetchSubjects}
      />
    </div>
  )
}
