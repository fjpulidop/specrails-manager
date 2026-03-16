import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog'
import { useHub } from '../hooks/useHub'
import type { HubProject } from '../hooks/useHub'

interface HubSettings {
  port: number
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

function ProjectListItem({
  project,
  onRemove,
}: {
  project: HubProject
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-border">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{project.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{project.path}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(project.id)}
      >
        Remove
      </Button>
    </div>
  )
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { projects, removeProject } = useHub()
  const [hubSettings, setHubSettings] = useState<HubSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    async function load() {
      try {
        const res = await fetch('/api/hub/settings')
        if (res.ok) {
          const data = await res.json() as HubSettings
          setHubSettings(data)
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [open])

  async function handleRemoveProject(id: string) {
    try {
      await removeProject(id)
      toast.success('Project removed')
    } catch (err) {
      toast.error('Failed to remove project', { description: (err as Error).message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Hub Settings
          </DialogTitle>
          <DialogDescription>
            Manage registered projects and view hub information.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
            <div className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Projects section */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Registered Projects
              </h3>
              {projects.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">No projects registered yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {projects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      onRemove={handleRemoveProject}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Hub info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hub Information
              </h3>
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Port</span>
                  <span className="font-mono">{hubSettings?.port ?? 4200}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Projects</span>
                  <span className="font-mono">{projects.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hub DB</span>
                  <span className="font-mono text-[10px] text-muted-foreground">~/.specrails/hub.sqlite</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
