import { openHubDb, queryProjects, queryProjectById } from '../db.js'

export interface GetProjectsResult {
  projects: Array<{
    id: string
    slug: string
    name: string
    path: string
    provider: 'claude' | 'codex'
    added_at: string
    last_seen_at: string
  }>
}

export function getProjects(): GetProjectsResult {
  const db = openHubDb()
  try {
    return { projects: queryProjects(db) }
  } finally {
    db.close()
  }
}

export function getProject(projectId: string): GetProjectsResult['projects'][number] {
  const db = openHubDb()
  try {
    const project = queryProjectById(db, projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    return project
  } finally {
    db.close()
  }
}
