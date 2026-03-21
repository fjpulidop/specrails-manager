import type Database from 'better-sqlite3'

export type DatabaseType = InstanceType<typeof Database>

// ─── Hub types ────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  slug: string
  name: string
  path: string
  provider: 'claude' | 'codex'
  added_at: string
  last_seen_at: string
}

// ─── Project DB types ─────────────────────────────────────────────────────────

export type JobStatus = 'running' | 'success' | 'failed' | 'cancelled'

export interface JobRow {
  id: string
  command: string
  status: JobStatus
  started_at: string
  finished_at: string | null
  tokens_in: number | null
  tokens_out: number | null
  tokens_cache_read: number | null
  tokens_cache_create: number | null
  total_cost_usd: number | null
  num_turns: number | null
  model: string | null
  duration_ms: number | null
  exit_code: number | null
}

export interface JobEventRow {
  seq: number
  event_type: string
  source: string | null
  payload: string
  timestamp: string
}

export interface JobDetailRow extends JobRow {
  session_id: string | null
  events: JobEventRow[]
  phases: Array<{ phase: string; state: string; updated_at: string }>
}

export interface ProjectKpi {
  total_jobs: number
  total_cost_usd: number
  success_rate: number
  avg_duration_ms: number
  tokens_in: number
  tokens_out: number
  tokens_cache_read: number
}
