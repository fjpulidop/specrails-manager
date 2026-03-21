import {
  openHubDb,
  openProjectDb,
  queryProjects,
  queryProjectById,
  queryAnalytics,
  queryCostTimeline,
} from '../db.js'

export type AnalyticsPeriod = '7d' | '30d' | 'all'

export interface GetAnalyticsParams {
  projectId?: string
  period?: AnalyticsPeriod
}

export interface ProjectAnalyticsResult {
  projectId: string
  projectName: string
  period: AnalyticsPeriod
  kpi: {
    totalJobs: number
    totalCostUsd: number
    successRate: number
    avgDurationMs: number
    tokensIn: number
    tokensOut: number
    tokensCacheRead: number
  }
  costTimeline: Array<{ date: string; costUsd: number; jobCount: number }>
}

export interface HubAnalyticsResult {
  period: AnalyticsPeriod
  hub: {
    totalJobs: number
    totalCostUsd: number
    successRate: number
    projectsActive: number
  }
  byProject: Array<{
    projectId: string
    projectName: string
    totalJobs: number
    totalCostUsd: number
    successRate: number
    avgDurationMs: number
  }>
}

export function getAnalytics(
  params: GetAnalyticsParams
): ProjectAnalyticsResult | HubAnalyticsResult {
  const period: AnalyticsPeriod = params.period ?? '30d'
  const fromDate = periodToDate(period)

  if (params.projectId) {
    return getProjectAnalytics(params.projectId, period, fromDate)
  }
  return getHubAnalytics(period, fromDate)
}

function getProjectAnalytics(
  projectId: string,
  period: AnalyticsPeriod,
  fromDate: string | null
): ProjectAnalyticsResult {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const projectDb = openProjectDb(project.slug)
    try {
      const kpi = queryAnalytics(projectDb, fromDate ?? undefined)
      const timeline = queryCostTimeline(projectDb, fromDate ?? undefined, period === '7d' ? 7 : 30)

      return {
        projectId: project.id,
        projectName: project.name,
        period,
        kpi: {
          totalJobs: kpi.total_jobs,
          totalCostUsd: kpi.total_cost_usd,
          successRate: kpi.success_rate,
          avgDurationMs: kpi.avg_duration_ms,
          tokensIn: kpi.tokens_in,
          tokensOut: kpi.tokens_out,
          tokensCacheRead: kpi.tokens_cache_read,
        },
        costTimeline: timeline.map((t) => ({
          date: t.date,
          costUsd: t.cost_usd,
          jobCount: t.job_count,
        })),
      }
    } finally {
      projectDb.close()
    }
  } finally {
    hubDb.close()
  }
}

function getHubAnalytics(period: AnalyticsPeriod, fromDate: string | null): HubAnalyticsResult {
  const hubDb = openHubDb()
  try {
    const projects = queryProjects(hubDb)

    let hubTotalCost = 0
    let hubTotalJobs = 0
    let hubSuccessJobs = 0
    const byProject: HubAnalyticsResult['byProject'] = []

    for (const project of projects) {
      try {
        const projectDb = openProjectDb(project.slug)
        try {
          const kpi = queryAnalytics(projectDb, fromDate ?? undefined)
          if (kpi.total_jobs > 0) {
            hubTotalCost += kpi.total_cost_usd
            hubTotalJobs += kpi.total_jobs
            hubSuccessJobs += Math.round(kpi.total_jobs * kpi.success_rate)
            byProject.push({
              projectId: project.id,
              projectName: project.name,
              totalJobs: kpi.total_jobs,
              totalCostUsd: kpi.total_cost_usd,
              successRate: kpi.success_rate,
              avgDurationMs: kpi.avg_duration_ms,
            })
          }
        } finally {
          projectDb.close()
        }
      } catch {
        // Project DB not yet initialized — skip
      }
    }

    return {
      period,
      hub: {
        totalJobs: hubTotalJobs,
        totalCostUsd: hubTotalCost,
        successRate: hubTotalJobs > 0 ? hubSuccessJobs / hubTotalJobs : 0,
        projectsActive: byProject.length,
      },
      byProject,
    }
  } finally {
    hubDb.close()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodToDate(period: AnalyticsPeriod): string | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : 30
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}
