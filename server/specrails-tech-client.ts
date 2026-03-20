/**
 * specrails-tech API v1 client.
 *
 * Typed HTTP client for the specrails-tech Rails application.
 * Contract defined in docs/engineering/rfcs/RFC-002-specrails-tech-api-v1.md
 *
 * All methods return null on connection failure — callers receive a
 * structured { connected: false } response rather than a thrown error.
 */

export interface SpecrailsAgent {
  slug: string
  name: string
  title: string | null
  status: string
  status_source: string
  agents_md_path: string
}

export interface SpecrailsDoc {
  slug: string
  title: string
  path: string
  updated_at: string
}

export interface SpecrailsDocDetail extends SpecrailsDoc {
  content: string
}

export interface SpecrailsHealth {
  status: string
}

export type FetchResult<T> =
  | { connected: true; data: T }
  | { connected: false; error: string }

const DEFAULT_BASE_URL = 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = 5000

async function fetchJson<T>(
  baseUrl: string,
  path: string
): Promise<FetchResult<T>> {
  const url = `${baseUrl}${path}`
  let response: Response

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'specrails-tech request timed out'
        : 'specrails-tech is not running'
    return { connected: false, error: message }
  }

  if (!response.ok) {
    return {
      connected: false,
      error: `specrails-tech returned ${response.status}`,
    }
  }

  try {
    const data = (await response.json()) as T
    return { connected: true, data }
  } catch {
    return { connected: false, error: 'specrails-tech returned invalid JSON' }
  }
}

export class SpecrailsTechClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  health(): Promise<FetchResult<SpecrailsHealth>> {
    return fetchJson<SpecrailsHealth>(this.baseUrl, '/api/v1/health')
  }

  async listAgents(): Promise<FetchResult<SpecrailsAgent[]>> {
    const result = await fetchJson<{ data: SpecrailsAgent[] }>(
      this.baseUrl,
      '/api/v1/agents'
    )
    if (!result.connected) return result
    return { connected: true, data: result.data.data }
  }

  async getAgent(slug: string): Promise<FetchResult<SpecrailsAgent>> {
    const result = await fetchJson<{ data: SpecrailsAgent }>(
      this.baseUrl,
      `/api/v1/agents/${encodeURIComponent(slug)}`
    )
    if (!result.connected) return result
    return { connected: true, data: result.data.data }
  }

  async listDocs(): Promise<FetchResult<SpecrailsDoc[]>> {
    const result = await fetchJson<{ data: SpecrailsDoc[] }>(
      this.baseUrl,
      '/api/v1/docs'
    )
    if (!result.connected) return result
    return { connected: true, data: result.data.data }
  }

  async getDoc(page: string): Promise<FetchResult<SpecrailsDocDetail>> {
    const result = await fetchJson<{ data: SpecrailsDocDetail }>(
      this.baseUrl,
      `/api/v1/docs/${encodeURIComponent(page)}`
    )
    if (!result.connected) return result
    return { connected: true, data: result.data.data }
  }
}

export function createSpecrailsTechClient(baseUrl?: string): SpecrailsTechClient {
  const url = baseUrl ?? process.env.SPECRAILS_TECH_URL ?? DEFAULT_BASE_URL
  return new SpecrailsTechClient(url)
}
