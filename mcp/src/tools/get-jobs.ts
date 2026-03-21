import { openHubDb, openProjectDb, queryProjectById, queryJobs, queryJobById } from '../db.js'
import type { JobRow, JobDetailRow } from '../types.js'

export interface GetJobsParams {
  projectId: string
  limit?: number
  offset?: number
  status?: string
}

export interface GetJobsResult {
  projectId: string
  projectName: string
  jobs: JobRow[]
  total: number
  limit: number
  offset: number
}

export function getJobs(params: GetJobsParams): GetJobsResult {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, params.projectId)
    if (!project) {
      throw new Error(`Project not found: ${params.projectId}`)
    }

    const projectDb = openProjectDb(project.slug)
    try {
      const limit = Math.min(params.limit ?? 20, 100)
      const offset = params.offset ?? 0
      const listOpts: Parameters<typeof queryJobs>[1] = { limit, offset }
      if (params.status) listOpts.status = params.status
      const { jobs, total } = queryJobs(projectDb, listOpts)

      return {
        projectId: project.id,
        projectName: project.name,
        jobs,
        total,
        limit,
        offset,
      }
    } finally {
      projectDb.close()
    }
  } finally {
    hubDb.close()
  }
}

export interface GetJobDetailParams {
  projectId: string
  jobId: string
}

export interface GetJobDetailResult {
  projectId: string
  projectName: string
  job: JobDetailRow
}

export function getJobDetail(params: GetJobDetailParams): GetJobDetailResult {
  const hubDb = openHubDb()
  try {
    const project = queryProjectById(hubDb, params.projectId)
    if (!project) {
      throw new Error(`Project not found: ${params.projectId}`)
    }

    const projectDb = openProjectDb(project.slug)
    try {
      const job = queryJobById(projectDb, params.jobId)
      if (!job) {
        throw new Error(`Job not found: ${params.jobId} in project ${project.name}`)
      }

      return {
        projectId: project.id,
        projectName: project.name,
        job,
      }
    } finally {
      projectDb.close()
    }
  } finally {
    hubDb.close()
  }
}
