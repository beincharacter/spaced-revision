'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Subject } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface BulkImportDialogProps {
  open: boolean
  onClose: () => void
  subjects: Subject[]
  onImported: () => void
}

export function BulkImportDialog({ open, onClose, subjects, onImported }: BulkImportDialogProps) {
  const [text, setText] = useState('')
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '')
  const [loading, setLoading] = useState(false)

  const parsed = text.split('\n').map(l => l.trim()).filter(Boolean)

  async function handleImport() {
    if (!subjectId || parsed.length === 0) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = parsed.map(name => ({ name, subject_id: subjectId, user_id: user.id, difficulty: 'medium' as const }))
    const { error } = await supabase.from('topics').insert(rows)

    setLoading(false)
    if (error) { toast.error('Import failed'); return }
    toast.success(`${parsed.length} topics imported!`)
    setText('')
    onImported()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Topics</DialogTitle>
          <DialogDescription>Paste one topic per line. All will be added to the selected subject.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label>Topics (one per line)</Label>
              {parsed.length > 0 && (
                <Badge variant="secondary">{parsed.length} topics</Badge>
              )}
            </div>
            <Textarea
              placeholder={'Diabetes\nHypertension\nHeart Failure\nThyroid Disorders'}
              className="min-h-[160px] font-mono text-sm"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          {parsed.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Preview:</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.slice(0, 20).map((t, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
                {parsed.length > 20 && <Badge variant="secondary" className="text-xs">+{parsed.length - 20} more</Badge>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={loading || parsed.length === 0 || !subjectId}>
            {loading ? 'Importing...' : `Import ${parsed.length} Topics`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
