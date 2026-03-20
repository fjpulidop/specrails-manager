import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useSharedWebSocket } from '../hooks/useSharedWebSocket'
import { useHub } from '../hooks/useHub'

interface HubState {
  projectCount: number
  costToday: number
  jobsToday: number
}

export function HubTodayWidget() {
  const { projects } = useHub()
  const [state, setState] = useState<HubState | null>(null)
  const { registerHandler, unregisterHandler } = useSharedWebSocket()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hub/state')
      if (!res.ok) return
      const data = await res.json() as HubState
      setState(data)
    } catch { /* ignore */ }
  }, [])

  // Initial load + 30s poll
  useEffect(() => {
    void load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // Refresh when any job finishes via WebSocket
  const handleWsMessage = useCallback((raw: unknown) => {
    const msg = raw as { type?: string; event_type?: string }
    if (msg.type === 'log' && msg.event_type === 'job_done') {
      void load()
    }
  }, [load])

  useEffect(() => {
    registerHandler('hub-today', handleWsMessage)
    return () => unregisterHandler('hub-today')
  }, [handleWsMessage, registerHandler, unregisterHandler])

  // Only show when there are multiple projects
  if (!state || projects.length < 2) return null

  return (
    <div className="rounded-lg border border-border/40 bg-card/30 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">Hub today:</span>
        <span className="text-xs font-mono font-medium">
          ${state.costToday.toFixed(4)}
        </span>
        <span className="text-xs text-muted-foreground">
          · {state.jobsToday} jobs across {state.projectCount} projects
        </span>
      </div>
      <Link
        to="/hub/analytics"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        View analytics →
      </Link>
    </div>
  )
}
