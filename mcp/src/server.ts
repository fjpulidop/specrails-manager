import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { listProjectsResource, getProjectResource } from './resources/projects.js'
import { listJobsResource, getJobResource } from './resources/jobs.js'
import { hubAnalyticsResource, projectAnalyticsResource } from './resources/analytics.js'

import { getProjects } from './tools/get-projects.js'
import { getJobs, getJobDetail } from './tools/get-jobs.js'
import { getAnalytics } from './tools/get-analytics.js'
import { enqueueJob } from './tools/enqueue-job.js'
import { getHubStatus } from './tools/hub-status.js'

// ─── Server factory ───────────────────────────────────────────────────────────

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'specrails-hub',
    version: '1.0.0',
  })

  registerResources(server)
  registerTools(server)

  return server
}

// ─── Resources ────────────────────────────────────────────────────────────────

function registerResources(server: McpServer): void {
  // List all projects
  server.resource(
    'projects',
    'specrails://hub/projects',
    { description: 'All projects registered in specrails-hub' },
    async (_uri) => ({
      contents: [{ uri: 'specrails://hub/projects', text: listProjectsResource(), mimeType: 'text/markdown' }],
    })
  )

  // Single project detail
  server.resource(
    'project',
    new ResourceTemplate('specrails://hub/projects/{projectId}', { list: undefined }),
    { description: 'Details and quick stats for a specific project' },
    async (_uri, { projectId }) => ({
      contents: [
        {
          uri: `specrails://hub/projects/${projectId}`,
          text: getProjectResource(projectId as string),
          mimeType: 'text/markdown',
        },
      ],
    })
  )

  // Jobs list for a project
  server.resource(
    'project-jobs',
    new ResourceTemplate('specrails://hub/projects/{projectId}/jobs', { list: undefined }),
    { description: 'Recent jobs for a specific project (last 50)' },
    async (_uri, { projectId }) => ({
      contents: [
        {
          uri: `specrails://hub/projects/${projectId}/jobs`,
          text: listJobsResource(projectId as string),
          mimeType: 'text/markdown',
        },
      ],
    })
  )

  // Single job detail
  server.resource(
    'job',
    new ResourceTemplate('specrails://hub/projects/{projectId}/jobs/{jobId}', { list: undefined }),
    { description: 'Job detail with events and logs' },
    async (_uri, { projectId, jobId }) => ({
      contents: [
        {
          uri: `specrails://hub/projects/${projectId}/jobs/${jobId}`,
          text: getJobResource(projectId as string, jobId as string),
          mimeType: 'text/markdown',
        },
      ],
    })
  )

  // Hub-wide analytics
  server.resource(
    'hub-analytics',
    'specrails://hub/analytics',
    { description: 'Aggregated analytics across all projects (last 30 days)' },
    async (_uri) => ({
      contents: [
        {
          uri: 'specrails://hub/analytics',
          text: hubAnalyticsResource('30d'),
          mimeType: 'text/markdown',
        },
      ],
    })
  )

  // Per-project analytics
  server.resource(
    'project-analytics',
    new ResourceTemplate('specrails://hub/projects/{projectId}/analytics', { list: undefined }),
    { description: 'Analytics for a specific project (last 30 days)' },
    async (_uri, { projectId }) => ({
      contents: [
        {
          uri: `specrails://hub/projects/${projectId}/analytics`,
          text: projectAnalyticsResource(projectId as string, '30d'),
          mimeType: 'text/markdown',
        },
      ],
    })
  )
}

// ─── Tools ────────────────────────────────────────────────────────────────────

function registerTools(server: McpServer): void {
  // hub_status — check if hub is running and healthy
  server.tool(
    'hub_status',
    'Check if specrails-hub server is running, how many projects are registered, and overall health',
    {},
    async () => {
      const status = await getHubStatus()
      const lines: string[] = ['## specrails-hub Status\n']
      lines.push(`- **Hub DB**: ${status.hubDbExists ? '✅ exists' : '❌ not found'}`)
      lines.push(`- **Projects**: ${status.projectCount}`)
      lines.push(`- **Server**: ${status.serverReachable ? `✅ reachable at ${status.serverUrl}` : `❌ not reachable at ${status.serverUrl}`}`)
      lines.push(`- **PID file**: ${status.pidFileExists ? `✅ exists (PID ${status.pid ?? 'unknown'})` : '❌ not found'}`)
      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      }
    }
  )

  // list_projects — list all projects
  server.tool(
    'list_projects',
    'List all projects registered in specrails-hub',
    {},
    () => {
      const result = getProjects()
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // get_jobs — list jobs for a project with optional filtering
  server.tool(
    'get_jobs',
    'Get jobs for a specific project with optional status filtering and pagination',
    {
      projectId: z.string().describe('Project ID from list_projects'),
      limit: z.number().int().min(1).max(100).optional().default(20).describe('Max jobs to return (default 20)'),
      offset: z.number().int().min(0).optional().default(0).describe('Pagination offset'),
      status: z
        .enum(['running', 'success', 'failed', 'cancelled'])
        .optional()
        .describe('Filter by job status'),
    },
    ({ projectId, limit, offset, status }) => {
      const params: Parameters<typeof getJobs>[0] = { projectId, limit, offset }
      if (status !== undefined) params.status = status
      const result = getJobs(params)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // get_job_detail — get a specific job with full event log
  server.tool(
    'get_job_detail',
    'Get detailed information about a specific job including its event log and phase transitions',
    {
      projectId: z.string().describe('Project ID from list_projects'),
      jobId: z.string().describe('Job ID from get_jobs'),
    },
    ({ projectId, jobId }) => {
      const result = getJobDetail({ projectId, jobId })
      // Truncate events to last 200 to avoid oversized responses
      const truncated = {
        ...result,
        job: {
          ...result.job,
          events: result.job.events.slice(-200),
          _eventsTruncated: result.job.events.length > 200
            ? `Showing last 200 of ${result.job.events.length} events`
            : undefined,
        },
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(truncated, null, 2) }],
      }
    }
  )

  // get_analytics — hub-wide or per-project analytics
  server.tool(
    'get_analytics',
    'Get analytics data — cost, job counts, success rates. Optionally scoped to a single project',
    {
      projectId: z
        .string()
        .optional()
        .describe('Project ID to scope analytics. Omit for hub-wide aggregation'),
      period: z
        .enum(['7d', '30d', 'all'])
        .optional()
        .default('30d')
        .describe('Time period: 7d, 30d, or all (default: 30d)'),
    },
    ({ projectId, period }) => {
      const params: Parameters<typeof getAnalytics>[0] = { period }
      if (projectId !== undefined) params.projectId = projectId
      const result = getAnalytics(params)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // enqueue_job — trigger a new job in a project
  server.tool(
    'enqueue_job',
    'Enqueue a new AI job in a specrails project. The hub server must be running. Commands follow specrails-core conventions (e.g. "implement", "health-check", "product-backlog")',
    {
      projectId: z.string().describe('Project ID to run the job in'),
      command: z.string().min(1).describe('Command to run (e.g. "implement", "health-check", "product-backlog #42")'),
      model: z.string().optional().describe('Override the AI model (e.g. "claude-opus-4-5")'),
    },
    async ({ projectId, command, model }) => {
      const params: Parameters<typeof enqueueJob>[0] = { projectId, command }
      if (model !== undefined) params.model = model
      const result = await enqueueJob(params)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}
