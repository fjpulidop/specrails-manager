import {
  openHubDb,
  openProjectDb,
  queryProjects,
  queryProjectById,
  queryAnalytics,
  queryCostTimeline,
} from '../db.js'

// ─── Resource: hub-wide analytics ────────────────────────────────────────────

export function hubAnalyticsResource(period: '7d' | '30d' | 'all' = '30d'): string {
  const hubDb = openHubDb()
  try {
    const projects = queryProjects(hubDb)

    if (projects.length === 0) {
      return 'No projects registered. Add projects to specrails-hub to see analytics.'
    }

    const fromDate = periodToDate(period)
    const periodLabel = period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'All time'

    const lines: string[] = [`# specrails-hub Analytics — ${periodLabel}\n`]

    let hubTotalCost = 0
    let hubTotalJobs = 0
    let hubSuccessJobs = 0

    const projectStats: Array<{
      name: string
      kpi: ReturnType<typeof queryAnalytics>
    }> = []

    for (const project of projects) {
      try {
        const projectDb = openProjectDb(project.slug)
        try {
          const kpi = queryAnalytics(projectDb, fromDate ?? undefined)
          hubTotalCost += kpi.total_cost_usd
          hubTotalJobs += kpi.total_jobs
          hubSuccessJobs += Math.round(kpi.total_jobs * kpi.success_rate)
          projectStats.push({ name: project.name, kpi })
        } finally {
          projectDb.close()
        }
      } catch {
        // Project DB not yet initialized — skip
      }
    }

    const hubSuccessRate = hubTotalJobs > 0 ? (hubSuccessJobs / hubTotalJobs) * 100 : 0

    lines.push('## Hub Summary\n')
    lines.push(`- **Total cost**: $${hubTotalCost.toFixed(4)}`)
    lines.push(`- **Total jobs**: ${hubTotalJobs}`)
    lines.push(`- **Success rate**: ${hubSuccessRate.toFixed(1)}%`)
    lines.push(`- **Projects active**: ${projectStats.filter((p) => p.kpi.total_jobs > 0).length}`)
    lines.push('')

    if (projectStats.some((p) => p.kpi.total_jobs > 0)) {
      lines.push('## By Project\n')
      lines.push('| Project | Jobs | Cost | Success Rate | Avg Duration |')
      lines.push('|---------|------|------|--------------|--------------|')

      for (const { name, kpi } of projectStats) {
        if (kpi.total_jobs === 0) continue
        const cost = `$${kpi.total_cost_usd.toFixed(4)}`
        const sr = `${(kpi.success_rate * 100).toFixed(1)}%`
        const dur = kpi.avg_duration_ms > 0 ? `${Math.round(kpi.avg_duration_ms / 1000)}s` : 'n/a'
        lines.push(`| ${name} | ${kpi.total_jobs} | ${cost} | ${sr} | ${dur} |`)
      }
      lines.push('')
    }

    return lines.join('\n')
  } finally {
    hubDb.close()
  }
}

// ─── Resource: single project analytics ──────────────────────────────────────

export function projectAnalyticsResource(
  projectId: string,
  period: '7d' | '30d' | 'all' = '30d'
): string {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const fromDate = periodToDate(period)
    const periodLabel = period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'All time'

    const projectDb = openProjectDb(project.slug)
    try {
      const kpi = queryAnalytics(projectDb, fromDate ?? undefined)
      const timeline = queryCostTimeline(projectDb, fromDate ?? undefined, period === '7d' ? 7 : 30)

      const lines: string[] = [`# Analytics — ${project.name} (${periodLabel})\n`]

      lines.push('## KPIs\n')
      lines.push(`- **Total jobs**: ${kpi.total_jobs}`)
      lines.push(`- **Total cost**: $${kpi.total_cost_usd.toFixed(6)}`)
      lines.push(`- **Success rate**: ${(kpi.success_rate * 100).toFixed(1)}%`)
      if (kpi.avg_duration_ms > 0)
        lines.push(`- **Avg duration**: ${Math.round(kpi.avg_duration_ms / 1000)}s`)
      lines.push('')

      if (kpi.tokens_in > 0) {
        lines.push('## Token Usage\n')
        lines.push(`- **Tokens in**: ${kpi.tokens_in.toLocaleString()}`)
        lines.push(`- **Tokens out**: ${kpi.tokens_out.toLocaleString()}`)
        if (kpi.tokens_cache_read > 0)
          lines.push(`- **Cache read**: ${kpi.tokens_cache_read.toLocaleString()}`)
        lines.push('')
      }

      if (timeline.length > 0) {
        lines.push('## Daily Cost Timeline\n')
        lines.push('| Date | Cost | Jobs |')
        lines.push('|------|------|------|')
        for (const day of timeline) {
          lines.push(`| ${day.date} | $${day.cost_usd.toFixed(4)} | ${day.job_count} |`)
        }
        lines.push('')
      }

      return lines.join('\n')
    } finally {
      projectDb.close()
    }
  } finally {
    hubDb.close()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodToDate(period: '7d' | '30d' | 'all'): string | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : 30
  const d = new Date(Date.now() - days * 86400000)
  return d.toISOString().slice(0, 10)
}
