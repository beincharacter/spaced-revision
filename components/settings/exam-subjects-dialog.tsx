'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

interface ExamSubjectsDialogProps {
  open: boolean
  examName: string
  subjects: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
  loading?: boolean
}

export function ExamSubjectsDialog({ open, examName, subjects, onClose, onConfirm, loading }: ExamSubjectsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(subjects))

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Add Subjects for {examName}
          </DialogTitle>
          <DialogDescription>Choose which subjects to add to your list</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {subjects.map(name => (
            <div key={name} className="flex items-center gap-2">
              <Checkbox
                id={`subject-${name}`}
                checked={selected.has(name)}
                onCheckedChange={() => toggle(name)}
              />
              <Label htmlFor={`subject-${name}`} className="font-normal cursor-pointer">{name}</Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Skip</Button>
          <Button onClick={() => onConfirm(Array.from(selected))} disabled={loading}>
            {loading ? 'Adding...' : `Add ${selected.size || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
