import { openHubDb, queryProjects, queryProjectById, openProjectDb, queryAnalytics } from '../db.js'

// ─── Resource: list all projects ──────────────────────────────────────────────

export function listProjectsResource(): string {
  const db = openHubDb()
  try {
    const projects = queryProjects(db)

    if (projects.length === 0) {
      return 'No projects registered in specrails-hub.\n\nAdd a project with: specrails-hub add <path>'
    }

    const lines: string[] = ['# specrails-hub Projects\n']

    for (const p of projects) {
      lines.push(`## ${p.name}`)
      lines.push(`- **ID**: ${p.id}`)
      lines.push(`- **Slug**: ${p.slug}`)
      lines.push(`- **Path**: ${p.path}`)
      lines.push(`- **Provider**: ${p.provider}`)
      lines.push(`- **Added**: ${p.added_at}`)
      lines.push(`- **Last seen**: ${p.last_seen_at}`)
      lines.push('')
    }

    return lines.join('\n')
  } finally {
    db.close()
  }
}

// ─── Resource: single project detail ─────────────────────────────────────────

export function getProjectResource(projectId: string): string {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, projectId)

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const lines: string[] = [`# Project: ${project.name}\n`]
    lines.push(`- **ID**: ${project.id}`)
    lines.push(`- **Slug**: ${project.slug}`)
    lines.push(`- **Path**: ${project.path}`)
    lines.push(`- **Provider**: ${project.provider}`)
    lines.push(`- **Added**: ${project.added_at}`)
    lines.push(`- **Last seen**: ${project.last_seen_at}`)
    lines.push('')

    // Try to add quick stats from the project DB
    try {
      const projectDb = openProjectDb(project.slug)
      try {
        const kpi = queryAnalytics(projectDb)
        lines.push('## Quick Stats (all time)\n')
        lines.push(`- **Total jobs**: ${kpi.total_jobs}`)
        lines.push(`- **Total cost**: $${kpi.total_cost_usd.toFixed(4)}`)
        lines.push(`- **Success rate**: ${(kpi.success_rate * 100).toFixed(1)}%`)
        if (kpi.avg_duration_ms > 0) {
          lines.push(`- **Avg duration**: ${Math.round(kpi.avg_duration_ms / 1000)}s`)
        }
      } finally {
        projectDb.close()
      }
    } catch {
      lines.push('*Project database not yet available (no jobs run yet)*')
    }

    return lines.join('\n')
  } finally {
    hubDb.close()
  }
}
