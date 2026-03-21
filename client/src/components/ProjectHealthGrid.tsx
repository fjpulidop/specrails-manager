import { Clock, AlertCircle, DollarSign, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ProjectHealth, HealthStatus } from '../types'

const TRAFFIC_LIGHT: Record<HealthStatus, { color: string; bg: string; label: string }> = {
  green:  { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Healthy' },
  yellow: { color: '#eab308', bg: 'rgba(234,179,8,0.10)',  label: 'Warning' },
  red:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   label: 'Critical' },
}

function TrafficLight({ status }: { status: HealthStatus }) {
  const cfg = TRAFFIC_LIGHT[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
      data-testid={`traffic-light-${status}`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

function HealthCard({
  project,
  onClick,
}: {
  project: ProjectHealth
  onClick: () => void
}) {
  const cfg = TRAFFIC_LIGHT[project.healthStatus]

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border/40 bg-card/50 p-4 hover:bg-card/80 transition-colors"
      style={{ borderLeftWidth: 3, borderLeftColor: cfg.color }}
      data-testid="health-card"
    >
      {/* Header: name + traffic light */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium truncate">{project.projectName}</p>
        <TrafficLight status={project.healthStatus} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* Success rate */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Success</span>
          <span className="ml-auto font-mono text-foreground/80">
            {(project.successRate24h * 100).toFixed(0)}%
          </span>
        </div>

        {/* Cost 24h */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DollarSign className="w-3 h-3 flex-shrink-0" />
          <span>Cost 24h</span>
          <span className="ml-auto font-mono text-foreground/80">
            ${project.totalCost24h.toFixed(2)}
          </span>
        </div>

        {/* Pending jobs */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Loader className="w-3 h-3 flex-shrink-0" />
          <span>Pending</span>
          <span className="ml-auto font-mono text-foreground/80">
            {project.pendingJobsCount}
          </span>
        </div>

        {/* Last success */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>Last OK</span>
          <span className="ml-auto font-mono text-foreground/80 truncate max-w-[80px]" title={project.lastSuccessfulJobAt ?? 'never'}>
            {project.lastSuccessfulJobAt ? timeAgo(project.lastSuccessfulJobAt) : 'never'}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function ProjectHealthGrid({
  projects,
  onSelectProject,
}: {
  projects: ProjectHealth[]
  onSelectProject: (projectId: string) => void
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/50 p-6 text-center">
        <p className="text-xs text-muted-foreground">No projects registered yet.</p>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      data-testid="health-grid"
    >
      {projects.map((p) => (
        <HealthCard
          key={p.projectId}
          project={p}
          onClick={() => onSelectProject(p.projectId)}
        />
      ))}
    </div>
  )
}
