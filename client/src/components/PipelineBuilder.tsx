import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, ArrowDown, Loader2 } from 'lucide-react'
import { getApiBase } from '../lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { CommandInfo } from '../types'

interface PipelineBuilderProps {
  open: boolean
  onClose: () => void
  commands: CommandInfo[]
}

interface PipelineStep {
  id: string
  command: string
}

let stepCounter = 0

export function PipelineBuilder({ open, onClose, commands }: PipelineBuilderProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: `step-${++stepCounter}`, command: '' },
  ])
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setSteps([{ id: `step-${++stepCounter}`, command: '' }])
    setSubmitting(false)
    onClose()
  }

  function addStep() {
    setSteps((prev) => [...prev, { id: `step-${++stepCounter}`, command: '' }])
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  function updateCommand(id: string, command: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, command } : s)))
  }

  function moveStep(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= steps.length) return
    setSteps((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  async function handleSubmit() {
    const validSteps = steps.filter((s) => s.command.trim())
    if (validSteps.length === 0) {
      toast.error('Add at least one command')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${getApiBase()}/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: validSteps.map((s) => ({ command: s.command.trim() })),
        }),
      })
      const data = (await res.json()) as {
        pipelineId?: string
        jobs?: Array<{ jobId: string }>
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create pipeline')
      toast.success('Pipeline created', {
        description: `${data.jobs?.length ?? validSteps.length} jobs chained`,
      })
      handleClose()
    } catch (err) {
      toast.error('Failed to create pipeline', {
        description: (err as Error).message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const hasValidSteps = steps.some((s) => s.command.trim())

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg glass-card">
        <DialogHeader>
          <DialogTitle>Create Pipeline</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Chain commands to run sequentially. Each step runs only after the
          previous one completes successfully.
        </p>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-1">
          {steps.map((step, idx) => (
            <div key={step.id}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-muted-foreground p-0.5 disabled:invisible"
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, idx - 1)}
                    aria-label="Move step up"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[10px] text-muted-foreground/60 font-mono w-4 text-center shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={step.command}
                    onChange={(e) => updateCommand(step.id, e.target.value)}
                    placeholder={
                      commands.length > 0
                        ? `e.g., /sr:${commands[0].slug}`
                        : 'Enter command...'
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-md border border-border/30 bg-background/50 focus:border-dracula-purple/50 focus:outline-none"
                    list={`commands-${step.id}`}
                  />
                  {commands.length > 0 && (
                    <datalist id={`commands-${step.id}`}>
                      {commands.map((cmd) => (
                        <option key={cmd.slug} value={`/sr:${cmd.slug}`}>
                          {cmd.name}
                        </option>
                      ))}
                    </datalist>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-destructive shrink-0"
                  disabled={steps.length <= 1}
                  onClick={() => removeStep(step.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-3 h-3 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addStep}
          className="w-full border-dashed"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Step
        </Button>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!hasValidSteps || submitting}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Create Pipeline ({steps.filter((s) => s.command.trim()).length} steps)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
