import { useEffect, useRef, useState } from 'react'
import { Badge } from './ui/badge'

interface SpecrailsAgent {
  slug: string
  name: string
  title: string | null
  status: string
  status_source: string
  agents_md_path: string
}

interface SpecrailsDoc {
  slug: string
  title: string
  path: string
  updated_at: string
}

type PanelState<T> =
  | { connected: false; error: string }
  | { connected: true; data: T }
  | null

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  idle: 'secondary',
  error: 'destructive',
}

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' {
  return STATUS_VARIANT[status.toLowerCase()] ?? 'secondary'
}

export function SpecrailsTechPanel() {
  const [agents, setAgents] = useState<PanelState<SpecrailsAgent[]>>(null)
  const [docs, setDocs] = useState<PanelState<SpecrailsDoc[]>>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function load() {
      try {
        const [agentRes, docsRes] = await Promise.all([
          fetch('/api/hub/specrails-tech/agents'),
          fetch('/api/hub/specrails-tech/docs'),
        ])

        if (!mountedRef.current) return

        if (agentRes.ok) {
          const payload = await agentRes.json() as { connected: boolean; data?: SpecrailsAgent[]; error?: string }
          setAgents(payload.connected ? { connected: true, data: payload.data ?? [] } : { connected: false, error: payload.error ?? 'Unknown error' })
        }

        if (docsRes.ok) {
          const payload = await docsRes.json() as { connected: boolean; data?: SpecrailsDoc[]; error?: string }
          setDocs(payload.connected ? { connected: true, data: payload.data ?? [] } : { connected: false, error: payload.error ?? 'Unknown error' })
        }
      } catch {
        if (!mountedRef.current) return
        setAgents({ connected: false, error: 'specrails-tech is not running' })
        setDocs({ connected: false, error: 'specrails-tech is not running' })
      }
    }

    load()
    return () => { mountedRef.current = false }
  }, [])

  const isOffline =
    (agents !== null && !agents.connected) ||
    (docs !== null && !docs.connected)

  if (isOffline) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          specrails-tech is not running —{' '}
          <span className="font-mono text-[10px]">localhost:3000</span>
        </p>
      </div>
    )
  }

  if (agents === null && docs === null) {
    return (
      <div className="rounded-lg border border-border bg-card/30 animate-pulse h-24" />
    )
  }

  const agentList = agents?.connected ? agents.data : []
  const docList = docs?.connected ? docs.data : []

  if (agentList.length === 0 && docList.length === 0) return null

  return (
    <div className="space-y-4">
      {agentList.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agentList.map((agent) => (
              <div
                key={agent.slug}
                className="flex items-center gap-2.5 rounded-md border border-border bg-card/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{agent.name}</p>
                  {agent.title && (
                    <p className="text-[10px] text-muted-foreground truncate">{agent.title}</p>
                  )}
                </div>
                <Badge variant={statusVariant(agent.status)} className="shrink-0 text-[10px]">
                  {agent.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {docList.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Docs
          </h2>
          <div className="space-y-1">
            {docList.map((doc) => (
              <div
                key={doc.slug}
                className="flex items-center justify-between px-3 py-1.5 rounded-md border border-border bg-card/30 text-xs"
              >
                <span className="truncate">{doc.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
