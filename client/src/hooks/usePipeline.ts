import { useState, useCallback, useLayoutEffect, useRef, useEffect } from 'react'
import { useSharedWebSocket } from './useSharedWebSocket'
import type { JobSummary, PhaseDefinition } from '../types'
import { getApiBase } from '../lib/api'

export type PhaseState = 'idle' | 'running' | 'done' | 'error'
export type PhaseMap = Record<string, PhaseState>

export interface LogLine {
  source: 'stdout' | 'stderr'
  line: string
  timestamp: string
  processId: string
}

export interface QueueJob {
  id: string
  command: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
  queuePosition: number | null
  startedAt: string | null
  finishedAt: string | null
  exitCode: number | null
}

export interface QueueState {
  jobs: QueueJob[]
  activeJobId: string | null
  paused: boolean
}

const INITIAL_QUEUE: QueueState = {
  jobs: [],
  activeJobId: null,
  paused: false,
}

export function usePipeline(activeProjectId?: string | null) {
  const [phaseDefinitions, setPhaseDefinitions] = useState<PhaseDefinition[]>([])
  const [phases, setPhases] = useState<PhaseMap>({})
  const [projectName, setProjectName] = useState('')
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [recentJobs, setRecentJobs] = useState<JobSummary[]>([])
  const [queueState, setQueueState] = useState<QueueState>(INITIAL_QUEUE)

  // Keep a ref to activeProjectId so the WS handler always sees the latest value
  const activeProjectRef = useRef(activeProjectId)
  activeProjectRef.current = activeProjectId

  // Reset state when active project changes
  useEffect(() => {
    setPhaseDefinitions([])
    setPhases({})
    setProjectName('')
    setLogLines([])
    setRecentJobs([])
    setQueueState(INITIAL_QUEUE)
  }, [activeProjectId])

  const handleMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; projectId?: string } & Record<string, unknown>

    // Filter: only process messages for the active project
    const currentProjectId = activeProjectRef.current
    if (currentProjectId && msg.projectId && msg.projectId !== currentProjectId) {
      return
    }

    if (msg.type === 'init') {
      setProjectName((msg.projectName as string) ?? '')
      const defs = (msg.phaseDefinitions ?? []) as PhaseDefinition[]
      setPhaseDefinitions(defs)
      const initialPhases: PhaseMap = {}
      for (const def of defs) {
        initialPhases[def.key] = ((msg.phases as Record<string, PhaseState>)?.[def.key]) ?? 'idle'
      }
      setPhases(initialPhases)
      const buf = (msg.logBuffer as LogLine[]) ?? []
      setLogLines(buf)
      setRecentJobs((msg.recentJobs as JobSummary[]) ?? [])
      const q = msg.queue as QueueState | undefined
      if (q) setQueueState(q)
    } else if (msg.type === 'phase') {
      setPhases((prev) => ({
        ...prev,
        [msg.phase as string]: msg.state as PhaseState,
      }))
    } else if (msg.type === 'log') {
      setLogLines((prev) => [
        ...prev,
        {
          source: msg.source as 'stdout' | 'stderr',
          line: msg.line as string,
          timestamp: msg.timestamp as string,
          processId: msg.processId as string,
        },
      ])
    } else if (msg.type === 'queue') {
      setQueueState({
        jobs: (msg.jobs as QueueJob[]) ?? [],
        activeJobId: (msg.activeJobId as string | null) ?? null,
        paused: (msg.paused as boolean) ?? false,
      })
    }
  }, [])

  const { registerHandler, unregisterHandler, connectionStatus } = useSharedWebSocket()

  useLayoutEffect(() => {
    registerHandler('pipeline', handleMessage)
    return () => unregisterHandler('pipeline')
  }, [handleMessage, registerHandler, unregisterHandler])

  // Fetch initial state for this project via REST (WS init only fires on connect)
  useEffect(() => {
    if (!activeProjectId) return
    async function fetchState() {
      try {
        const res = await fetch(`${getApiBase()}/state`)
        if (!res.ok) return
        const msg = await res.json()
        if (msg.projectName) setProjectName(msg.projectName)
        if (msg.phaseDefinitions) {
          setPhaseDefinitions(msg.phaseDefinitions)
          const initialPhases: PhaseMap = {}
          for (const def of msg.phaseDefinitions as PhaseDefinition[]) {
            initialPhases[def.key] = msg.phases?.[def.key] ?? 'idle'
          }
          setPhases(initialPhases)
        }
        if (msg.recentJobs) setRecentJobs(msg.recentJobs)
        if (msg.queue) setQueueState(msg.queue)
      } catch {
        // ignore — state endpoint may not exist in hub mode
      }
    }
    fetchState()
  }, [activeProjectId])

  return { phases, phaseDefinitions, projectName, logLines, connectionStatus, recentJobs, queueState }
}
