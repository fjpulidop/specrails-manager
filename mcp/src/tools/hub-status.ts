import { openHubDb, queryProjects, getHubApiBase } from '../db.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface HubStatusResult {
  hubDbExists: boolean
  projectCount: number
  serverReachable: boolean
  serverUrl: string
  pidFileExists: boolean
  pid: number | null
}

export async function getHubStatus(): Promise<HubStatusResult> {
  const pidPath = path.join(os.homedir(), '.specrails', 'manager.pid')
  const serverUrl = getHubApiBase()

  // Check hub DB
  let hubDbExists = false
  let projectCount = 0
  try {
    const db = openHubDb()
    hubDbExists = true
    const projects = queryProjects(db)
    projectCount = projects.length
    db.close()
  } catch {
    hubDbExists = false
  }

  // Check PID file
  let pidFileExists = false
  let pid: number | null = null
  if (fs.existsSync(pidPath)) {
    pidFileExists = true
    try {
      pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10)
    } catch {
      // ignore
    }
  }

  // Check server reachability
  let serverReachable = false
  try {
    const response = await fetch(`${serverUrl}/api/hub/state`, {
      signal: AbortSignal.timeout(3_000),
    })
    serverReachable = response.ok
  } catch {
    serverReachable = false
  }

  return {
    hubDbExists,
    projectCount,
    serverReachable,
    serverUrl,
    pidFileExists,
    pid,
  }
}
