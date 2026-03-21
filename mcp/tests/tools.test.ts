import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import type { DatabaseType } from '../src/types.js'

// ─── DB factory helpers ───────────────────────────────────────────────────────

function makeFreshHubDb(): DatabaseType {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE, db_path TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'claude',
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.prepare(`
    INSERT INTO projects (id, slug, name, path, db_path, provider) VALUES
    ('proj-1', 'my-project', 'My Project', '/home/user/my-project', '/my-project/db', 'claude'),
    ('proj-2', 'other-proj', 'Other Project', '/home/user/other', '/other/db', 'codex')
  `).run()
  return db
}

function makeFreshProjectDb(): DatabaseType {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, command TEXT NOT NULL, started_at TEXT NOT NULL,
      finished_at TEXT, status TEXT NOT NULL DEFAULT 'running',
      exit_code INTEGER, tokens_in INTEGER, tokens_out INTEGER,
      tokens_cache_read INTEGER, tokens_cache_create INTEGER,
      total_cost_usd REAL, num_turns INTEGER, model TEXT,
      duration_ms INTEGER, duration_api_ms INTEGER, session_id TEXT
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
      seq INTEGER NOT NULL, event_type TEXT NOT NULL, source TEXT,
      payload TEXT NOT NULL, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE job_phases (
      job_id TEXT NOT NULL, phase TEXT NOT NULL, state TEXT NOT NULL,
      updated_at TEXT NOT NULL, PRIMARY KEY (job_id, phase)
    );
  `)
  db.prepare(`
    INSERT INTO jobs (id, command, started_at, status, total_cost_usd, duration_ms, model) VALUES
    ('job-a', 'implement', '2024-06-01T10:00:00', 'success', 0.15, 45000, 'claude-sonnet-4-5'),
    ('job-b', 'health-check', '2024-06-02T10:00:00', 'failed', 0.02, 8000, 'claude-sonnet-4-5')
  `).run()
  return db
}

// ─── Mock the db module — fresh DB per call ───────────────────────────────────

vi.mock('../src/db.js', async () => {
  const actual = await vi.importActual<typeof import('../src/db.js')>('../src/db.js')
  return {
    ...actual,
    openHubDb: () => makeFreshHubDb(),
    openProjectDb: (_slug: string) => makeFreshProjectDb(),
    getHubApiBase: () => 'http://localhost:4200',
  }
})

import { getProjects } from '../src/tools/get-projects.js'
import { getJobs, getJobDetail } from '../src/tools/get-jobs.js'
import { getAnalytics } from '../src/tools/get-analytics.js'

// ─── getProjects ──────────────────────────────────────────────────────────────

describe('getProjects', () => {
  it('returns all projects', () => {
    const result = getProjects()
    expect(result.projects).toHaveLength(2)
    expect(result.projects[0]?.slug).toBe('my-project')
    expect(result.projects[1]?.slug).toBe('other-proj')
  })

  it('includes provider field', () => {
    const result = getProjects()
    expect(result.projects[0]?.provider).toBe('claude')
    expect(result.projects[1]?.provider).toBe('codex')
  })
})

// ─── getJobs ─────────────────────────────────────────────────────────────────

describe('getJobs', () => {
  it('returns jobs for a project', () => {
    const result = getJobs({ projectId: 'proj-1' })
    expect(result.projectId).toBe('proj-1')
    expect(result.projectName).toBe('My Project')
    expect(result.jobs).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('throws for unknown project', () => {
    expect(() => getJobs({ projectId: 'nope' })).toThrow('Project not found')
  })

  it('respects limit', () => {
    const result = getJobs({ projectId: 'proj-1', limit: 1 })
    expect(result.jobs).toHaveLength(1)
    expect(result.total).toBe(2)
  })

  it('filters by status', () => {
    const result = getJobs({ projectId: 'proj-1', status: 'success' })
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]?.status).toBe('success')
  })
})

// ─── getJobDetail ─────────────────────────────────────────────────────────────

describe('getJobDetail', () => {
  it('returns job detail', () => {
    const result = getJobDetail({ projectId: 'proj-1', jobId: 'job-a' })
    expect(result.projectId).toBe('proj-1')
    expect(result.job.id).toBe('job-a')
    expect(result.job.command).toBe('implement')
    expect(result.job.events).toBeDefined()
    expect(result.job.phases).toBeDefined()
  })

  it('throws for unknown project', () => {
    expect(() => getJobDetail({ projectId: 'unknown', jobId: 'job-a' })).toThrow('Project not found')
  })

  it('throws for unknown job', () => {
    expect(() => getJobDetail({ projectId: 'proj-1', jobId: 'does-not-exist' })).toThrow('Job not found')
  })
})

// ─── getAnalytics ─────────────────────────────────────────────────────────────

describe('getAnalytics — hub-wide', () => {
  it('returns hub analytics with byProject breakdown', () => {
    const result = getAnalytics({ period: '30d' })
    expect('hub' in result).toBe(true)
    if ('hub' in result) {
      expect(result.hub.totalJobs).toBeGreaterThanOrEqual(0)
      expect(result.byProject).toBeDefined()
    }
  })
})

describe('getAnalytics — per project', () => {
  it('returns project analytics with kpi and timeline', () => {
    const result = getAnalytics({ projectId: 'proj-1', period: '30d' })
    expect('kpi' in result).toBe(true)
    if ('kpi' in result) {
      expect(result.kpi.totalJobs).toBeGreaterThanOrEqual(0)
      expect(result.costTimeline).toBeDefined()
    }
  })

  it('throws for unknown project', () => {
    expect(() => getAnalytics({ projectId: 'unknown' })).toThrow('Project not found')
  })
})
