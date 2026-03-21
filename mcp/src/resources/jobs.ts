import {
  openHubDb,
  openProjectDb,
  queryProjectById,
  queryJobs,
  queryJobById,
} from '../db.js'

// ─── Resource: jobs list for a project ───────────────────────────────────────

export function listJobsResource(projectId: string): string {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const projectDb = openProjectDb(project.slug)
    try {
      const { jobs, total } = queryJobs(projectDb, { limit: 50 })

      const lines: string[] = [`# Jobs — ${project.name}\n`]
      lines.push(`**Total jobs**: ${total}\n`)

      if (jobs.length === 0) {
        lines.push('No jobs found for this project.')
        return lines.join('\n')
      }

      for (const job of jobs) {
        const statusEmoji = statusIcon(job.status)
        const cost = job.total_cost_usd != null ? `$${job.total_cost_usd.toFixed(4)}` : 'n/a'
        const duration =
          job.duration_ms != null ? `${Math.round(job.duration_ms / 1000)}s` : 'n/a'
        const started = job.started_at.slice(0, 19).replace('T', ' ')

        lines.push(`## ${statusEmoji} ${job.command}`)
        lines.push(`- **ID**: ${job.id}`)
        lines.push(`- **Status**: ${job.status}`)
        lines.push(`- **Started**: ${started}`)
        lines.push(`- **Duration**: ${duration}`)
        lines.push(`- **Cost**: ${cost}`)
        if (job.model) lines.push(`- **Model**: ${job.model}`)
        lines.push('')
      }

      if (total > jobs.length) {
        lines.push(`*Showing ${jobs.length} of ${total} jobs. Use get_jobs tool with offset to paginate.*`)
      }

      return lines.join('\n')
    } finally {
      projectDb.close()
    }
  } finally {
    hubDb.close()
  }
}

// ─── Resource: single job detail ─────────────────────────────────────────────

export function getJobResource(projectId: string, jobId: string): string {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const projectDb = openProjectDb(project.slug)
    try {
      const job = queryJobById(projectDb, jobId)
      if (!job) {
        throw new Error(`Job not found: ${jobId}`)
      }

      const lines: string[] = [`# Job: ${job.command}\n`]
      lines.push(`- **ID**: ${job.id}`)
      lines.push(`- **Status**: ${statusIcon(job.status)} ${job.status}`)
      lines.push(`- **Started**: ${job.started_at}`)
      if (job.finished_at) lines.push(`- **Finished**: ${job.finished_at}`)
      if (job.duration_ms != null) lines.push(`- **Duration**: ${Math.round(job.duration_ms / 1000)}s`)
      if (job.exit_code != null) lines.push(`- **Exit code**: ${job.exit_code}`)
      lines.push('')

      // Token & cost info
      if (job.total_cost_usd != null || job.tokens_in != null) {
        lines.push('## Tokens & Cost\n')
        if (job.total_cost_usd != null)
          lines.push(`- **Total cost**: $${job.total_cost_usd.toFixed(6)}`)
        if (job.tokens_in != null) lines.push(`- **Tokens in**: ${job.tokens_in}`)
        if (job.tokens_out != null) lines.push(`- **Tokens out**: ${job.tokens_out}`)
        if (job.tokens_cache_read != null)
          lines.push(`- **Cache read**: ${job.tokens_cache_read}`)
        if (job.tokens_cache_create != null)
          lines.push(`- **Cache create**: ${job.tokens_cache_create}`)
        if (job.num_turns != null) lines.push(`- **Turns**: ${job.num_turns}`)
        if (job.model) lines.push(`- **Model**: ${job.model}`)
        lines.push('')
      }

      // Phases
      if (job.phases.length > 0) {
        lines.push('## Phases\n')
        for (const phase of job.phases) {
          lines.push(`- **${phase.phase}**: ${phase.state}`)
        }
        lines.push('')
      }

      // Events/logs — show last 100 to keep output manageable
      if (job.events.length > 0) {
        lines.push(`## Events (${job.events.length} total)\n`)
        const eventsToShow = job.events.slice(-100)
        if (eventsToShow.length < job.events.length) {
          lines.push(`*Showing last ${eventsToShow.length} of ${job.events.length} events*\n`)
        }
        for (const event of eventsToShow) {
          const ts = event.timestamp.slice(11, 19)
          let payloadStr = ''
          try {
            const parsed = JSON.parse(event.payload) as unknown
            if (typeof parsed === 'object' && parsed !== null && 'text' in parsed) {
              payloadStr = String((parsed as { text: unknown }).text).slice(0, 300)
            } else {
              payloadStr = JSON.stringify(parsed).slice(0, 300)
            }
          } catch {
            payloadStr = event.payload.slice(0, 300)
          }
          lines.push(`\`${ts}\` **[${event.event_type}]** ${payloadStr}`)
        }
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

function statusIcon(status: string): string {
  switch (status) {
    case 'success': return '✅'
    case 'failed': return '❌'
    case 'running': return '🔄'
    case 'cancelled': return '⚪'
    default: return '❓'
  }
}
