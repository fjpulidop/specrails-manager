import { FlaskConical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import type { JobSummary, JobStatus } from '../types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'running' | 'queued' | 'failed' | 'canceled'

const STATUS_BADGE: Record<JobStatus, { variant: BadgeVariant; label: string }> = {
  running: { variant: 'running', label: 'running' },
  completed: { variant: 'success', label: 'done' },
  failed: { variant: 'failed', label: 'failed' },
  canceled: { variant: 'canceled', label: 'canceled' },
  queued: { variant: 'queued', label: 'queued' },
}

function formatCost(cost: number | null | undefined): string | null {
  if (cost == null || cost === 0) return null
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(3)}`
}

function formatRelTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

interface TestRunnerWidgetProps {
  jobs: JobSummary[]
  onLaunch: () => void
}

export function TestRunnerWidget({ jobs, onLaunch }: TestRunnerWidgetProps) {
  const testJobs = jobs.filter((j) => j.command.includes('/sr:test'))
  const lastTestJob = testJobs[0] ?? null
  const isRunning = lastTestJob?.status === 'running'

  if (lastTestJob === null) {
    return (
      <div className="glass-card flex items-start gap-4 px-4 py-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-dracula-current/40">
          <FlaskConical className="w-4.5 h-4.5 text-dracula-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">No test runs yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Run /sr:test to generate tests for this project.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onLaunch} className="shrink-0">
          Run Tests
        </Button>
      </div>
    )
  }

  if (isRunning) {
    return (
      <div className="glass-card flex items-center gap-4 px-4 py-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-dracula-current/40 animate-pulse">
          <FlaskConical className="w-4.5 h-4.5 text-dracula-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Test run in progress...</p>
        </div>
        <Badge variant="running">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
          Running
        </Badge>
      </div>
    )
  }

  const statusInfo = STATUS_BADGE[lastTestJob.status] ?? STATUS_BADGE.queued
  const cost = formatCost(lastTestJob.total_cost_usd)

  return (
    <div className="glass-card flex items-start gap-4 px-4 py-4">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-dracula-current/40">
        <FlaskConical className="w-4.5 h-4.5 text-dracula-cyan" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">Last test run</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatRelTime(lastTestJob.started_at)}
          </span>
          {cost && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">{cost}</span>
            </>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onLaunch} className="shrink-0">
        Run Again
      </Button>
    </div>
  )
}
