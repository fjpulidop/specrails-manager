import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { DatabaseType, ProjectRow, JobRow, JobEventRow, ProjectKpi, JobDetailRow } from './types.js'

// ─── Hub paths ────────────────────────────────────────────────────────────────

export function getHubDbPath(): string {
  return path.join(os.homedir(), '.specrails', 'hub.sqlite')
}

export function getProjectDbPath(slug: string): string {
  return path.join(os.homedir(), '.specrails', 'projects', slug, 'jobs.sqlite')
}

export function getHubApiBase(): string {
  return 'http://localhost:4200'
}

// ─── Connection helpers ───────────────────────────────────────────────────────

export function openHubDb(): DatabaseType {
  const dbPath = getHubDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Hub database not found at ${dbPath}. Is specrails-hub running or has it been started at least once?`
    )
  }
  return new Database(dbPath, { readonly: true })
}

export function openProjectDb(slug: string): DatabaseType {
  const dbPath = getProjectDbPath(slug)
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Project database not found for project "${slug}" at ${dbPath}`)
  }
  return new Database(dbPath, { readonly: true })
}

// ─── Hub queries ──────────────────────────────────────────────────────────────

export function queryProjects(db: DatabaseType): ProjectRow[] {
  return db
    .prepare(
      `SELECT id, slug, name, path, provider, added_at, last_seen_at
       FROM projects
       ORDER BY last_seen_at DESC`
    )
    .all() as ProjectRow[]
}

export function queryProjectById(db: DatabaseType, projectId: string): ProjectRow | null {
  const row = db
    .prepare(
      `SELECT id, slug, name, path, provider, added_at, last_seen_at
       FROM projects
       WHERE id = ?`
    )
    .get(projectId) as ProjectRow | undefined
  return row ?? null
}

export function queryProjectBySlug(db: DatabaseType, slug: string): ProjectRow | null {
  const row = db
    .prepare(
      `SELECT id, slug, name, path, provider, added_at, last_seen_at
       FROM projects
       WHERE slug = ?`
    )
    .get(slug) as ProjectRow | undefined
  return row ?? null
}

// ─── Project DB queries ───────────────────────────────────────────────────────

export interface ListJobsOpts {
  limit?: number
  offset?: number
  status?: string
}

export function queryJobs(
  db: DatabaseType,
  opts: ListJobsOpts = {}
): { jobs: JobRow[]; total: number } {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0

  const whereClauses: string[] = []
  const params: unknown[] = []

  if (opts.status) {
    whereClauses.push('status = ?')
    params.push(opts.status)
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM jobs ${where}`).get(...params) as {
      count: number
    }
  ).count

  const jobs = db
    .prepare(
      `SELECT id, command, status, started_at, finished_at,
              tokens_in, tokens_out, tokens_cache_read, tokens_cache_create,
              total_cost_usd, num_turns, model, duration_ms, exit_code
       FROM jobs ${where}
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as JobRow[]

  return { jobs, total }
}

export function queryJobById(db: DatabaseType, jobId: string): JobDetailRow | null {
  const job = db
    .prepare(
      `SELECT id, command, status, started_at, finished_at,
              tokens_in, tokens_out, tokens_cache_read, tokens_cache_create,
              total_cost_usd, num_turns, model, duration_ms, exit_code, session_id
       FROM jobs
       WHERE id = ?`
    )
    .get(jobId) as JobDetailRow | undefined

  if (!job) return null

  const events = db
    .prepare(
      `SELECT seq, event_type, source, payload, timestamp
       FROM events
       WHERE job_id = ?
       ORDER BY seq ASC`
    )
    .all(jobId) as JobEventRow[]

  const phases = db
    .prepare(
      `SELECT phase, state, updated_at
       FROM job_phases
       WHERE job_id = ?`
    )
    .all(jobId) as Array<{ phase: string; state: string; updated_at: string }>

  return { ...job, events, phases }
}

export function queryAnalytics(db: DatabaseType, fromDate?: string): ProjectKpi {
  const where = fromDate ? 'WHERE started_at >= ?' : ''
  const params = fromDate ? [fromDate] : []

  const kpi = db
    .prepare(
      `SELECT
         COUNT(*) as total_jobs,
         COALESCE(SUM(total_cost_usd), 0) as total_cost_usd,
         COALESCE(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
         COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
         COALESCE(SUM(tokens_in), 0) as tokens_in,
         COALESCE(SUM(tokens_out), 0) as tokens_out,
         COALESCE(SUM(tokens_cache_read), 0) as tokens_cache_read
       FROM jobs ${where}`
    )
    .get(...params) as ProjectKpi

  return kpi
}

export function queryCostTimeline(
  db: DatabaseType,
  fromDate?: string,
  days = 7
): Array<{ date: string; cost_usd: number; job_count: number }> {
  const where = fromDate ? 'WHERE date(started_at) >= ?' : ''
  const params = fromDate ? [fromDate] : []

  return db
    .prepare(
      `SELECT
         date(started_at) as date,
         COALESCE(SUM(total_cost_usd), 0) as cost_usd,
         COUNT(*) as job_count
       FROM jobs ${where}
       GROUP BY date(started_at)
       ORDER BY date DESC
       LIMIT ?`
    )
    .all(...params, days) as Array<{ date: string; cost_usd: number; job_count: number }>
}
