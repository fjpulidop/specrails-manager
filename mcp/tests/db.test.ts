import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import type { DatabaseType } from '../src/types.js'
import { queryProjects, queryProjectById, queryProjectBySlug, queryJobs, queryJobById, queryAnalytics, queryCostTimeline } from '../src/db.js'

// ─── In-memory DB helpers ─────────────────────────────────────────────────────

function createHubDb(): DatabaseType {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE projects (
      id           TEXT PRIMARY KEY,
      slug         TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      path         TEXT NOT NULL UNIQUE,
      db_path      TEXT NOT NULL,
      provider     TEXT NOT NULL DEFAULT 'claude',
      added_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  return db
}

function createProjectDb(): DatabaseType {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE jobs (
      id                   TEXT    PRIMARY KEY,
      command              TEXT    NOT NULL,
      started_at           TEXT    NOT NULL,
      finished_at          TEXT,
      status               TEXT    NOT NULL DEFAULT 'running',
      exit_code            INTEGER,
      tokens_in            INTEGER,
      tokens_out           INTEGER,
      tokens_cache_read    INTEGER,
      tokens_cache_create  INTEGER,
      total_cost_usd       REAL,
      num_turns            INTEGER,
      model                TEXT,
      duration_ms          INTEGER,
      duration_api_ms      INTEGER,
      session_id           TEXT
    );

    CREATE TABLE events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id      TEXT    NOT NULL,
      seq         INTEGER NOT NULL,
      event_type  TEXT    NOT NULL,
      source      TEXT,
      payload     TEXT    NOT NULL,
      timestamp   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE job_phases (
      job_id      TEXT    NOT NULL,
      phase       TEXT    NOT NULL,
      state       TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL,
      PRIMARY KEY (job_id, phase)
    );
  `)
  return db
}

// ─── Hub DB tests ─────────────────────────────────────────────────────────────

describe('queryProjects', () => {
  it('returns empty array when no projects', () => {
    const db = createHubDb()
    expect(queryProjects(db)).toEqual([])
    db.close()
  })

  it('returns all projects ordered by last_seen_at desc', () => {
    const db = createHubDb()
    db.prepare(`
      INSERT INTO projects (id, slug, name, path, db_path, provider, added_at, last_seen_at) VALUES
      ('p1', 'alpha', 'Alpha', '/alpha', '/alpha/db', 'claude', '2024-01-01', '2024-01-10'),
      ('p2', 'beta',  'Beta',  '/beta',  '/beta/db',  'codex',  '2024-01-02', '2024-01-20')
    `).run()

    const projects = queryProjects(db)
    expect(projects).toHaveLength(2)
    expect(projects[0]?.slug).toBe('beta') // later last_seen_at first
    expect(projects[1]?.slug).toBe('alpha')
    db.close()
  })
})

describe('queryProjectById', () => {
  it('returns null for unknown id', () => {
    const db = createHubDb()
    expect(queryProjectById(db, 'unknown')).toBeNull()
    db.close()
  })

  it('returns project when found', () => {
    const db = createHubDb()
    db.prepare(`
      INSERT INTO projects (id, slug, name, path, db_path, provider) VALUES
      ('proj-1', 'my-proj', 'My Project', '/my/proj', '/my/proj/db', 'claude')
    `).run()

    const project = queryProjectById(db, 'proj-1')
    expect(project).not.toBeNull()
    expect(project?.name).toBe('My Project')
    expect(project?.provider).toBe('claude')
    db.close()
  })
})

describe('queryProjectBySlug', () => {
  it('returns null for unknown slug', () => {
    const db = createHubDb()
    expect(queryProjectBySlug(db, 'nope')).toBeNull()
    db.close()
  })

  it('returns project when slug matches', () => {
    const db = createHubDb()
    db.prepare(`
      INSERT INTO projects (id, slug, name, path, db_path, provider) VALUES
      ('p1', 'my-slug', 'My Project', '/p', '/p/db', 'codex')
    `).run()

    const project = queryProjectBySlug(db, 'my-slug')
    expect(project?.id).toBe('p1')
    expect(project?.provider).toBe('codex')
    db.close()
  })
})

// ─── Project DB tests ─────────────────────────────────────────────────────────

describe('queryJobs', () => {
  let db: DatabaseType

  beforeEach(() => {
    db = createProjectDb()
    db.prepare(`
      INSERT INTO jobs (id, command, started_at, status, total_cost_usd, duration_ms) VALUES
      ('j1', 'implement', '2024-01-01T10:00:00', 'success', 0.05, 30000),
      ('j2', 'health-check', '2024-01-02T10:00:00', 'failed', 0.01, 5000),
      ('j3', 'product-backlog', '2024-01-03T10:00:00', 'running', null, null)
    `).run()
  })

  it('returns all jobs ordered by started_at desc', () => {
    const { jobs, total } = queryJobs(db)
    expect(total).toBe(3)
    expect(jobs[0]?.id).toBe('j3')
    expect(jobs[2]?.id).toBe('j1')
  })

  it('filters by status', () => {
    const { jobs, total } = queryJobs(db, { status: 'success' })
    expect(total).toBe(1)
    expect(jobs[0]?.id).toBe('j1')
  })

  it('respects limit', () => {
    const { jobs, total } = queryJobs(db, { limit: 2 })
    expect(jobs).toHaveLength(2)
    expect(total).toBe(3) // total is still all
  })

  it('respects offset', () => {
    const { jobs } = queryJobs(db, { limit: 1, offset: 1 })
    expect(jobs[0]?.id).toBe('j2')
  })

  it('caps limit at 200', () => {
    const { jobs } = queryJobs(db, { limit: 9999 })
    expect(jobs).toHaveLength(3) // only 3 jobs exist
  })
})

describe('queryJobById', () => {
  let db: DatabaseType

  beforeEach(() => {
    db = createProjectDb()
    db.prepare(`
      INSERT INTO jobs (id, command, started_at, status) VALUES ('job-1', 'implement', '2024-01-01', 'success')
    `).run()
    db.prepare(`
      INSERT INTO events (job_id, seq, event_type, source, payload) VALUES
      ('job-1', 1, 'text', 'assistant', '{"text":"hello"}'),
      ('job-1', 2, 'text', 'assistant', '{"text":"world"}')
    `).run()
    db.prepare(`
      INSERT INTO job_phases (job_id, phase, state, updated_at) VALUES
      ('job-1', 'architect', 'done', '2024-01-01T10:00:00'),
      ('job-1', 'developer', 'done', '2024-01-01T10:05:00')
    `).run()
  })

  it('returns null for unknown job', () => {
    expect(queryJobById(db, 'nope')).toBeNull()
  })

  it('returns job with events and phases', () => {
    const job = queryJobById(db, 'job-1')
    expect(job).not.toBeNull()
    expect(job?.id).toBe('job-1')
    expect(job?.events).toHaveLength(2)
    expect(job?.events[0]?.event_type).toBe('text')
    expect(job?.phases).toHaveLength(2)
    expect(job?.phases[0]?.phase).toBe('architect')
  })
})

describe('queryAnalytics', () => {
  it('returns zeros on empty DB', () => {
    const db = createProjectDb()
    const kpi = queryAnalytics(db)
    expect(kpi.total_jobs).toBe(0)
    expect(kpi.total_cost_usd).toBe(0)
    expect(kpi.success_rate).toBe(0)
    db.close()
  })

  it('calculates correct success rate', () => {
    const db = createProjectDb()
    db.prepare(`
      INSERT INTO jobs (id, command, started_at, status, total_cost_usd) VALUES
      ('j1', 'cmd', '2024-01-01', 'success', 0.10),
      ('j2', 'cmd', '2024-01-02', 'success', 0.20),
      ('j3', 'cmd', '2024-01-03', 'failed', 0.05)
    `).run()

    const kpi = queryAnalytics(db)
    expect(kpi.total_jobs).toBe(3)
    expect(kpi.total_cost_usd).toBeCloseTo(0.35)
    expect(kpi.success_rate).toBeCloseTo(2 / 3)
    db.close()
  })

  it('respects fromDate filter', () => {
    const db = createProjectDb()
    db.prepare(`
      INSERT INTO jobs (id, command, started_at, status, total_cost_usd) VALUES
      ('j1', 'cmd', '2024-01-01', 'success', 0.10),
      ('j2', 'cmd', '2024-06-01', 'success', 0.20)
    `).run()

    const kpi = queryAnalytics(db, '2024-04-01')
    expect(kpi.total_jobs).toBe(1)
    expect(kpi.total_cost_usd).toBeCloseTo(0.20)
    db.close()
  })
})

describe('queryCostTimeline', () => {
  it('returns aggregated daily costs', () => {
    const db = createProjectDb()
    db.prepare(`
      INSERT INTO jobs (id, command, started_at, status, total_cost_usd) VALUES
      ('j1', 'cmd', '2024-01-01T10:00:00', 'success', 0.10),
      ('j2', 'cmd', '2024-01-01T15:00:00', 'success', 0.05),
      ('j3', 'cmd', '2024-01-02T10:00:00', 'failed', 0.02)
    `).run()

    const timeline = queryCostTimeline(db)
    expect(timeline).toHaveLength(2)
    const day1 = timeline.find((d) => d.date === '2024-01-02')
    const day2 = timeline.find((d) => d.date === '2024-01-01')
    expect(day1?.job_count).toBe(1)
    expect(day2?.job_count).toBe(2)
    expect(day2?.cost_usd).toBeCloseTo(0.15)
    db.close()
  })
})
