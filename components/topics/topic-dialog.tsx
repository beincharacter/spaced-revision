'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Topic, Subject } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TopicDialogProps {
  open: boolean
  onClose: () => void
  topic?: Topic | null
  subjects: Subject[]
  defaultSubjectId?: string
  onSaved: () => void
}

export function TopicDialog({ open, onClose, topic, subjects, defaultSubjectId, onSaved }: TopicDialogProps) {
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (topic) {
      setName(topic.name)
      setSubjectId(topic.subject_id)
      setDifficulty(topic.difficulty)
    } else {
      setName('')
      setSubjectId(defaultSubjectId || subjects[0]?.id || '')
      setDifficulty('medium')
    }
  }, [topic, subjects, defaultSubjectId, open])

  async function handleSave() {
    if (!name.trim() || !subjectId) return
    setLoading(true)
    const supabase = createClient()

    if (topic) {
      const { error } = await supabase.from('topics').update({ name: name.trim(), subject_id: subjectId, difficulty }).eq('id', topic.id)
      if (error) { toast.error('Failed to update topic'); setLoading(false); return }
      toast.success('Topic updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('topics').insert({ name: name.trim(), subject_id: subjectId, difficulty, user_id: user.id })
      if (error) { toast.error('Failed to create topic'); setLoading(false); return }
      toast.success('Topic created!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topic ? 'Edit Topic' : 'New Topic'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">Topic Name</Label>
            <Input
              id="topic-name"
              placeholder="e.g. Diabetes, Calculus, World War II..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim() || !subjectId}>
            {loading ? 'Saving...' : topic ? 'Save Changes' : 'Create Topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
