import { useState } from 'react'
import { toast } from 'sonner'
import { FolderOpen } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { useHub } from '../hooks/useHub'

interface AddProjectDialogProps {
  open: boolean
  onClose: () => void
}

type DialogState =
  | { step: 'input' }

export function AddProjectDialog({ open, onClose }: AddProjectDialogProps) {
  const [projectPath, setProjectPath] = useState('')
  const [projectName, setProjectName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [dialogState] = useState<DialogState>({ step: 'input' })

  const { startSetupWizard, setActiveProjectId } = useHub()

  async function handleAdd() {
    const trimmedPath = projectPath.trim()
    if (!trimmedPath) {
      toast.error('Project path is required')
      return
    }

    setIsAdding(true)
    try {
      const res = await fetch('/api/hub/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmedPath, name: projectName.trim() || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error('Failed to add project', { description: data.error })
        return
      }

      const project = data.project

      if (data.has_specrails === false) {
        // Close the dialog and switch to the project tab, then trigger wizard
        resetAndClose()
        setActiveProjectId(project.id)
        startSetupWizard(project.id)
      } else {
        toast.success(`Project "${project.name}" registered`)
        resetAndClose()
      }
    } catch (err) {
      toast.error('Failed to add project', { description: (err as Error).message })
    } finally {
      setIsAdding(false)
    }
  }

  function resetAndClose() {
    setProjectPath('')
    setProjectName('')
    onClose()
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) resetAndClose()
  }

  if (dialogState.step === 'input') {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Add Project
            </DialogTitle>
            <DialogDescription>
              Register a project directory to manage it from the hub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Project path <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="/Users/me/my-project"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAdd() }}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Absolute path to the project root
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Display name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                placeholder="My Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAdd() }}
              />
              <p className="text-[10px] text-muted-foreground">
                Defaults to the directory name
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose} disabled={isAdding}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isAdding || !projectPath.trim()}>
              {isAdding ? 'Adding...' : 'Add Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
