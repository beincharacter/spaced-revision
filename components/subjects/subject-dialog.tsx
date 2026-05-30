'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SUBJECT_COLORS, type Subject } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SubjectDialogProps {
  open: boolean
  onClose: () => void
  subject?: Subject | null
  onSaved: () => void
}

export function SubjectDialog({ open, onClose, subject, onSaved }: SubjectDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (subject) {
      setName(subject.name)
      setColor(subject.color)
    } else {
      setName('')
      setColor(SUBJECT_COLORS[0])
    }
  }, [subject, open])

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const supabase = createClient()

    if (subject) {
      const { error } = await supabase.from('subjects').update({ name: name.trim(), color }).eq('id', subject.id)
      if (error) { toast.error('Failed to update subject'); setLoading(false); return }
      toast.success('Subject updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('subjects').insert({ name: name.trim(), color, user_id: user.id })
      if (error) { toast.error('Failed to create subject'); setLoading(false); return }
      toast.success('Subject created!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? 'Edit Subject' : 'New Subject'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">Name</Label>
            <Input
              id="subject-name"
              placeholder="e.g. Medicine, Physics, History..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map(c => (
                <button
                  key={c}
                  className={cn('w-8 h-8 rounded-full transition-transform hover:scale-110', color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : '')}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? 'Saving...' : subject ? 'Save Changes' : 'Create Subject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
