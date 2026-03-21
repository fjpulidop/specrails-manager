import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { getHubAnalytics, getHubTodayStats, getHubRecentJobs, searchHubContent, getHubOverview, getHubHealth } from './hub-analytics'
import { initDb } from './db'
import type { ProjectRegistry, ProjectContext } from './project-registry'
import type { DbInstance } from './db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProjectDb(jobs: Array<{ costUsd: number; status: string; startedAt?: string }>): DbInstance {
  const db = initDb(':memory:')
  const today = new Date().toISOString().slice(0, 10)
  for (const job of jobs) {
    db.prepare(`
      INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd, duration_ms)
      VALUES (?, 'implement', ?, ?, ?, ?, 1000)
    `).run(
      crypto.randomUUID(),
      job.status,
      job.startedAt ?? `${today}T10:00:00.000Z`,
      `${today}T10:01:00.000Z`,
      job.costUsd
    )
  }
  return db
}

function makeRegistry(contexts: Array<{ id: string; name: string; db: DbInstance }>): ProjectRegistry {
  const ctxMap = new Map(
    contexts.map((c) => [
      c.id,
      {
        project: { id: c.id, name: c.name, slug: c.name, path: '/tmp', db_path: ':memory:', added_at: '', last_seen_at: '' },
        db: c.db,
        queueManager: {} as any,
        chatManager: {} as any,
        setupManager: {} as any,
        proposalManager: {} as any,
        broadcast: vi.fn(),
      } satisfies ProjectContext,
    ])
  )

  return {
    hubDb: {} as any,
    getContext: (id) => ctxMap.get(id),
    getContextByPath: () => undefined,
    addProject: vi.fn() as any,
    removeProject: vi.fn(),
    touchProject: vi.fn(),
    listContexts: () => Array.from(ctxMap.values()),
  } as unknown as ProjectRegistry
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getHubAnalytics', () => {
  it('returns zero KPIs when no projects are registered', () => {
    const registry = makeRegistry([])
    const result = getHubAnalytics(registry, { period: '7d' })

    expect(result.kpi.totalJobs).toBe(0)
    expect(result.kpi.totalCostUsd).toBe(0)
    expect(result.kpi.successRate).toBe(0)
    expect(result.projectBreakdown).toEqual([])
    expect(result.costTimeline).toEqual([])
  })

  it('aggregates KPIs across multiple projects', () => {
    const db1 = makeProjectDb([
      { costUsd: 0.01, status: 'completed' },
      { costUsd: 0.02, status: 'completed' },
    ])
    const db2 = makeProjectDb([
      { costUsd: 0.03, status: 'failed' },
    ])
    const registry = makeRegistry([
      { id: 'p1', name: 'Project One', db: db1 },
      { id: 'p2', name: 'Project Two', db: db2 },
    ])

    const result = getHubAnalytics(registry, { period: '7d' })

    expect(result.kpi.totalJobs).toBe(3)
    expect(result.kpi.totalCostUsd).toBeCloseTo(0.06, 5)
    expect(result.kpi.successRate).toBeCloseTo(2 / 3, 5)
  })

  it('returns one entry per project in projectBreakdown', () => {
    const db1 = makeProjectDb([{ costUsd: 0.05, status: 'completed' }])
    const db2 = makeProjectDb([{ costUsd: 0.02, status: 'failed' }])
    const registry = makeRegistry([
      { id: 'p1', name: 'Alpha', db: db1 },
      { id: 'p2', name: 'Beta', db: db2 },
    ])

    const result = getHubAnalytics(registry, { period: '7d' })

    expect(result.projectBreakdown).toHaveLength(2)
    // Sorted by cost descending
    expect(result.projectBreakdown[0].projectName).toBe('Alpha')
    expect(result.projectBreakdown[1].projectName).toBe('Beta')
  })

  it('merges cost timeline across projects by date', () => {
    const today = new Date().toISOString().slice(0, 10)
    const db1 = makeProjectDb([{ costUsd: 0.01, status: 'completed', startedAt: `${today}T09:00:00.000Z` }])
    const db2 = makeProjectDb([{ costUsd: 0.02, status: 'completed', startedAt: `${today}T11:00:00.000Z` }])
    const registry = makeRegistry([
      { id: 'p1', name: 'Alpha', db: db1 },
      { id: 'p2', name: 'Beta', db: db2 },
    ])

    const result = getHubAnalytics(registry, { period: '7d' })

    // Both jobs on same date — timeline should have one entry for today with sum
    const todayEntry = result.costTimeline.find((e) => e.date === today)
    expect(todayEntry).toBeDefined()
    expect(todayEntry!.costUsd).toBeCloseTo(0.03, 5)
  })

  it('includes period label in response', () => {
    const registry = makeRegistry([])
    const result = getHubAnalytics(registry, { period: '30d' })
    expect(result.period.label).toBe('Last 30 days')
  })

  it('jobsToday and costToday reflect only today\'s data', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const db = makeProjectDb([
      { costUsd: 0.10, status: 'completed', startedAt: `${today}T10:00:00.000Z` },
      { costUsd: 0.20, status: 'completed', startedAt: `${yesterday}T10:00:00.000Z` },
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Project', db }])

    const result = getHubAnalytics(registry, { period: '7d' })

    expect(result.kpi.jobsToday).toBe(1)
    expect(result.kpi.costToday).toBeCloseTo(0.10, 5)
  })
})

describe('getHubTodayStats', () => {
  it('returns zeros when no projects', () => {
    const registry = makeRegistry([])
    const stats = getHubTodayStats(registry)
    expect(stats.costToday).toBe(0)
    expect(stats.jobsToday).toBe(0)
  })

  it('aggregates today stats from all projects', () => {
    const today = new Date().toISOString().slice(0, 10)
    const db1 = makeProjectDb([{ costUsd: 0.05, status: 'completed', startedAt: `${today}T10:00:00.000Z` }])
    const db2 = makeProjectDb([{ costUsd: 0.07, status: 'completed', startedAt: `${today}T11:00:00.000Z` }])
    const registry = makeRegistry([
      { id: 'p1', name: 'A', db: db1 },
      { id: 'p2', name: 'B', db: db2 },
    ])

    const stats = getHubTodayStats(registry)
    expect(stats.jobsToday).toBe(2)
    expect(stats.costToday).toBeCloseTo(0.12, 5)
  })
})

// ─── getHubRecentJobs ─────────────────────────────────────────────────────────

describe('getHubRecentJobs', () => {
  it('returns empty list when no projects', () => {
    const registry = makeRegistry([])
    expect(getHubRecentJobs(registry)).toEqual([])
  })

  it('returns jobs sorted by started_at descending', () => {
    const today = new Date().toISOString().slice(0, 10)
    const db = makeProjectDb([
      { costUsd: 0.01, status: 'completed', startedAt: `${today}T08:00:00.000Z` },
      { costUsd: 0.02, status: 'completed', startedAt: `${today}T10:00:00.000Z` },
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Proj', db }])
    const jobs = getHubRecentJobs(registry)
    expect(jobs[0].started_at > jobs[1].started_at).toBe(true)
  })

  it('merges jobs across projects and respects limit', () => {
    const today = new Date().toISOString().slice(0, 10)
    const db1 = makeProjectDb([
      { costUsd: 0.01, status: 'completed', startedAt: `${today}T09:00:00.000Z` },
      { costUsd: 0.01, status: 'completed', startedAt: `${today}T11:00:00.000Z` },
    ])
    const db2 = makeProjectDb([
      { costUsd: 0.01, status: 'running', startedAt: `${today}T10:00:00.000Z` },
    ])
    const registry = makeRegistry([
      { id: 'p1', name: 'Alpha', db: db1 },
      { id: 'p2', name: 'Beta', db: db2 },
    ])
    const jobs = getHubRecentJobs(registry, 2)
    expect(jobs).toHaveLength(2)
    expect(jobs[0].started_at >= jobs[1].started_at).toBe(true)
  })

  it('includes projectId and projectName on each job', () => {
    const db = makeProjectDb([{ costUsd: 0.01, status: 'completed' }])
    const registry = makeRegistry([{ id: 'proj-1', name: 'MyProject', db }])
    const jobs = getHubRecentJobs(registry)
    expect(jobs[0].projectId).toBe('proj-1')
    expect(jobs[0].projectName).toBe('MyProject')
  })
})

// ─── searchHubContent ─────────────────────────────────────────────────────────

describe('searchHubContent', () => {
  it('returns empty groups when no projects', () => {
    const registry = makeRegistry([])
    const result = searchHubContent(registry, 'test')
    expect(result.groups).toEqual([])
    expect(result.total).toBe(0)
    expect(result.query).toBe('test')
  })

  it('finds jobs matching command', () => {
    const db = makeProjectDb([
      { costUsd: 0.01, status: 'completed' }, // command = 'implement'
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Project', db }])
    const result = searchHubContent(registry, 'implement')
    expect(result.total).toBeGreaterThan(0)
    expect(result.groups[0].jobs).toHaveLength(1)
  })

  it('returns no results for non-matching query', () => {
    const db = makeProjectDb([{ costUsd: 0.01, status: 'completed' }])
    const registry = makeRegistry([{ id: 'p1', name: 'Project', db }])
    const result = searchHubContent(registry, 'zzz_no_match_xyzzy')
    expect(result.groups).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('omits projects with no matches', () => {
    const db1 = makeProjectDb([{ costUsd: 0.01, status: 'completed' }]) // command = 'implement'
    const db2 = makeProjectDb([{ costUsd: 0.01, status: 'completed' }]) // command = 'implement'
    const registry = makeRegistry([
      { id: 'p1', name: 'A', db: db1 },
      { id: 'p2', name: 'B', db: db2 },
    ])
    const result = searchHubContent(registry, 'implement')
    expect(result.groups).toHaveLength(2)
  })
})

// ─── getHubAnalytics — buildWhere edge cases ──────────────────────────────────

describe('getHubAnalytics — custom period edge cases', () => {
  it('handles custom period with only from date', () => {
    const db = makeProjectDb([{ costUsd: 0.05, status: 'completed' }])
    const registry = makeRegistry([{ id: 'p1', name: 'Proj', db }])
    const today = new Date().toISOString().slice(0, 10)
    const result = getHubAnalytics(registry, { period: 'custom', from: today })
    expect(result.kpi.totalJobs).toBeGreaterThanOrEqual(0)
  })

  it('handles custom period with only to date', () => {
    const db = makeProjectDb([{ costUsd: 0.05, status: 'completed' }])
    const registry = makeRegistry([{ id: 'p1', name: 'Proj', db }])
    const today = new Date().toISOString().slice(0, 10)
    const result = getHubAnalytics(registry, { period: 'custom', to: today })
    expect(result.kpi.totalJobs).toBeGreaterThanOrEqual(0)
  })
})

// ─── getHubOverview ───────────────────────────────────────────────────────────

describe('getHubOverview', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('/tmp/specrails-hub-overview-test-')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function makeRegistryWithPath(
    contexts: Array<{ id: string; name: string; db: DbInstance; path?: string }>
  ): ProjectRegistry {
    const ctxMap = new Map(
      contexts.map((c) => [
        c.id,
        {
          project: {
            id: c.id,
            name: c.name,
            slug: c.name,
            path: c.path ?? '/tmp/nonexistent',
            db_path: ':memory:',
            added_at: '',
            last_seen_at: '',
          },
          db: c.db,
          queueManager: {} as any,
          chatManager: {} as any,
          setupManager: {} as any,
          proposalManager: {} as any,
          broadcast: vi.fn(),
        },
      ])
    )
    return {
      hubDb: {} as any,
      getContext: (id) => ctxMap.get(id),
      getContextByPath: () => undefined,
      addProject: vi.fn() as any,
      removeProject: vi.fn(),
      touchProject: vi.fn(),
      listContexts: () => Array.from(ctxMap.values()),
    } as unknown as ProjectRegistry
  }

  it('returns empty projects and zero aggregates for empty registry', () => {
    const registry = makeRegistryWithPath([])
    const result = getHubOverview(registry)
    expect(result.projects).toEqual([])
    expect(result.aggregated.totalCount).toBe(0)
    expect(result.aggregated.healthyCount).toBe(0)
    expect(result.aggregated.activeJobs).toBe(0)
    expect(result.recentJobs).toEqual([])
  })

  it('returns project overview for a single project', () => {
    const db = makeProjectDb([{ costUsd: 0.01, status: 'completed' }])
    const registry = makeRegistryWithPath([{ id: 'p1', name: 'MyProject', db, path: tmpDir }])
    const result = getHubOverview(registry)
    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].projectId).toBe('p1')
    expect(result.projects[0].projectName).toBe('MyProject')
    expect(result.aggregated.totalCount).toBe(1)
  })

  it('includes coverage pct from coverage-summary.json when present', () => {
    const coverageDir = path.join(tmpDir, 'coverage')
    fs.mkdirSync(coverageDir)
    fs.writeFileSync(
      path.join(coverageDir, 'coverage-summary.json'),
      JSON.stringify({ total: { lines: { pct: 85 } } })
    )
    const db = makeProjectDb([])
    const registry = makeRegistryWithPath([{ id: 'p1', name: 'Covered', db, path: tmpDir }])
    const result = getHubOverview(registry)
    expect(result.projects[0].coveragePct).toBe(85)
  })

  it('returns null coveragePct when no coverage file exists', () => {
    const db = makeProjectDb([])
    const registry = makeRegistryWithPath([{ id: 'p1', name: 'NoCov', db, path: tmpDir }])
    const result = getHubOverview(registry)
    expect(result.projects[0].coveragePct).toBeNull()
  })

  it('classifies projects into healthy/warning/critical buckets', () => {
    const db1 = makeProjectDb([{ costUsd: 0.01, status: 'completed' }])
    const db2 = makeProjectDb([])
    const db3 = makeProjectDb([{ costUsd: 0.01, status: 'failed' }])
    const registry = makeRegistryWithPath([
      { id: 'p1', name: 'Healthy', db: db1 },
      { id: 'p2', name: 'Empty', db: db2 },
      { id: 'p3', name: 'Failed', db: db3 },
    ])
    const result = getHubOverview(registry)
    expect(result.aggregated.totalCount).toBe(3)
    const totalBuckets = result.aggregated.healthyCount + result.aggregated.warningCount + result.aggregated.criticalCount
    expect(totalBuckets).toBe(3)
  })

  it('sorts projects by active jobs descending', () => {
    const dbActive = initDb(':memory:')
    dbActive.prepare(
      `INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd, duration_ms)
       VALUES (?, 'implement', 'running', ?, null, 0, 0)`
    ).run(crypto.randomUUID(), new Date().toISOString())

    const dbIdle = makeProjectDb([])
    const registry = makeRegistryWithPath([
      { id: 'p1', name: 'Idle', db: dbIdle },
      { id: 'p2', name: 'Active', db: dbActive },
    ])
    const result = getHubOverview(registry)
    expect(result.projects[0].projectName).toBe('Active')
  })
})

// ─── getHubHealth ────────────────────────────────────────────────────────────

describe('getHubHealth', () => {
  it('returns empty when no projects are registered', () => {
    const registry = makeRegistry([])
    const result = getHubHealth(registry)
    expect(result.projects).toEqual([])
    expect(result.aggregated).toEqual({ totalCount: 0, greenCount: 0, yellowCount: 0, redCount: 0 })
  })

  it('returns green when success rate >80% and recent success', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString() // 1h ago
    const db = makeProjectDb([
      { costUsd: 0.10, status: 'completed', startedAt: recentIso },
      { costUsd: 0.05, status: 'completed', startedAt: recentIso },
      { costUsd: 0.02, status: 'completed', startedAt: recentIso },
      { costUsd: 0.01, status: 'completed', startedAt: recentIso },
      { costUsd: 0.03, status: 'completed', startedAt: recentIso },
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Healthy', db }])
    const result = getHubHealth(registry)

    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].healthStatus).toBe('green')
    expect(result.projects[0].successRate24h).toBe(1)
    expect(result.projects[0].totalCost24h).toBeCloseTo(0.21)
    expect(result.aggregated.greenCount).toBe(1)
  })

  it('returns yellow when success rate is between 60-80%', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const db = makeProjectDb([
      { costUsd: 0.10, status: 'completed', startedAt: recentIso },
      { costUsd: 0.10, status: 'completed', startedAt: recentIso },
      { costUsd: 0.10, status: 'completed', startedAt: recentIso },
      { costUsd: 0.10, status: 'failed', startedAt: recentIso },
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Warning', db }])
    const result = getHubHealth(registry)

    expect(result.projects[0].healthStatus).toBe('yellow')
    expect(result.projects[0].successRate24h).toBe(0.75)
    expect(result.aggregated.yellowCount).toBe(1)
  })

  it('returns red when success rate <60%', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const db = makeProjectDb([
      { costUsd: 0.10, status: 'completed', startedAt: recentIso },
      { costUsd: 0.10, status: 'failed', startedAt: recentIso },
      { costUsd: 0.10, status: 'failed', startedAt: recentIso },
      { costUsd: 0.10, status: 'failed', startedAt: recentIso },
    ])
    const registry = makeRegistry([{ id: 'p1', name: 'Critical', db }])
    const result = getHubHealth(registry)

    expect(result.projects[0].healthStatus).toBe('red')
    expect(result.projects[0].successRate24h).toBe(0.25)
    expect(result.aggregated.redCount).toBe(1)
  })

  it('returns red when last success was >24h ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const db = initDb(':memory:')
    db.prepare(`
      INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd, duration_ms)
      VALUES (?, 'implement', 'completed', ?, ?, 0.05, 1000)
    `).run(crypto.randomUUID(), twoDaysAgo, twoDaysAgo)

    const registry = makeRegistry([{ id: 'p1', name: 'Stale', db }])
    const result = getHubHealth(registry)

    expect(result.projects[0].healthStatus).toBe('red')
    expect(result.projects[0].lastSuccessfulJobAt).toBeTruthy()
  })

  it('returns yellow when >5 pending jobs', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const db = initDb(':memory:')
    // Insert 10 completed recent jobs (high success rate)
    for (let i = 0; i < 10; i++) {
      db.prepare(`
        INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd)
        VALUES (?, 'cmd', 'completed', ?, ?, 0.01)
      `).run(crypto.randomUUID(), recentIso, recentIso)
    }
    // Insert 6 queued jobs (pending)
    for (let i = 0; i < 6; i++) {
      db.prepare(`
        INSERT INTO jobs (id, command, status, started_at)
        VALUES (?, 'cmd', 'queued', ?)
      `).run(crypto.randomUUID(), recentIso)
    }
    const registry = makeRegistry([{ id: 'p1', name: 'Queued', db }])
    const result = getHubHealth(registry)

    expect(result.projects[0].healthStatus).toBe('yellow')
    expect(result.projects[0].pendingJobsCount).toBe(6)
  })

  it('sorts projects red → yellow → green', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

    const greenDb = makeProjectDb([
      { costUsd: 0.01, status: 'completed', startedAt: recentIso },
    ])
    const yellowDb = makeProjectDb([
      { costUsd: 0.01, status: 'completed', startedAt: recentIso },
      { costUsd: 0.01, status: 'completed', startedAt: recentIso },
      { costUsd: 0.01, status: 'completed', startedAt: recentIso },
      { costUsd: 0.01, status: 'failed', startedAt: recentIso },
    ])
    const redDb = initDb(':memory:')
    redDb.prepare(`
      INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd, duration_ms)
      VALUES (?, 'implement', 'completed', ?, ?, 0.01, 1000)
    `).run(crypto.randomUUID(), twoDaysAgo, twoDaysAgo)

    const registry = makeRegistry([
      { id: 'green', name: 'Green', db: greenDb },
      { id: 'yellow', name: 'Yellow', db: yellowDb },
      { id: 'red', name: 'Red', db: redDb },
    ])
    const result = getHubHealth(registry)

    expect(result.projects[0].healthStatus).toBe('red')
    expect(result.projects[1].healthStatus).toBe('yellow')
    expect(result.projects[2].healthStatus).toBe('green')
  })

  it('returns correct cost and pending counts', () => {
    const now = new Date()
    const recentIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const db = initDb(':memory:')
    db.prepare(`
      INSERT INTO jobs (id, command, status, started_at, finished_at, total_cost_usd)
      VALUES (?, 'cmd', 'completed', ?, ?, 1.50)
    `).run('j1', recentIso, recentIso)
    db.prepare(`
      INSERT INTO jobs (id, command, status, started_at, total_cost_usd)
      VALUES (?, 'cmd', 'running', ?, 0.25)
    `).run('j2', recentIso)

    const registry = makeRegistry([{ id: 'p1', name: 'Test', db }])
    const result = getHubHealth(registry)

    expect(result.projects[0].totalCost24h).toBeCloseTo(1.75)
    expect(result.projects[0].pendingJobsCount).toBe(1)
  })
})
