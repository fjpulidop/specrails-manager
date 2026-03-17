import { useState } from 'react'
import { getApiBase } from '../lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface TestWizardProps {
  open: boolean
  onClose: () => void
}

export function TestWizard({ open, onClose }: TestWizardProps) {
  const [paths, setPaths] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (submitting) return
    setPaths('')
    setSubmitting(false)
    setQueued(false)
    setError(null)
    onClose()
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const command = paths.trim() ? `/sr:test ${paths.trim()}` : '/sr:test'

    try {
      const res = await fetch(`${getApiBase()}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = await res.json() as { jobId?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue job')

      setQueued(true)
      setTimeout(() => {
        handleClose()
      }, 800)
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md glass-card">
        <DialogHeader>
          <DialogTitle>Run Test Writer</DialogTitle>
          <DialogDescription>
            Generate tests for specific files, or leave empty to test all recently changed files.
          </DialogDescription>
        </DialogHeader>

        {queued ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-sm font-medium text-dracula-green">Queued!</p>
            <p className="text-xs text-muted-foreground">Test writer job added to the queue.</p>
          </div>
        ) : (
          <>
            <div className="py-2 space-y-2">
              <label className="sr-only" htmlFor="test-wizard-paths">
                File Paths
              </label>
              <Input
                id="test-wizard-paths"
                placeholder="src/module.ts, src/utils.ts (optional)"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) handleSubmit()
                }}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Running...
                  </span>
                ) : (
                  'Run Tests'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
