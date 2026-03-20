# RFC-002: specrails-tech API v1

## Status

Accepted

## Summary

Defines the HTTP API contract for `specrails-tech` (the specrails Rails application) v1. The Hub application (`specrails-hub`) consumes this API to display agent status and documentation in the local dashboard.

## Motivation

`specrails-hub` is the local orchestration dashboard. `specrails-tech` is the web-facing Rails app that tracks agent definitions, docs, and project state. Rather than duplicating that information in the hub, the hub fetches it from specrails-tech at runtime. This creates a single source of truth for agent metadata and documentation.

## Detailed Design

### Base URL

Default: `http://localhost:3000`

Configurable via:
1. Hub settings (`hub_settings` table, key `specrails_tech_url`)
2. `SPECRAILS_TECH_URL` environment variable (server startup override)

### Endpoints

#### `GET /api/v1/health`

Health check. Returns `200 OK` when the Rails server is running.

```json
{ "status": "ok" }
```

#### `GET /api/v1/agents`

List all agents defined in the specrails configuration.

**Response:**
```json
{
  "data": [
    {
      "slug": "string",
      "name": "string",
      "title": "string | null",
      "status": "string",
      "status_source": "string",
      "agents_md_path": "string"
    }
  ]
}
```

Field descriptions:
- `slug` — URL-safe identifier (e.g., `"hub-engineer"`)
- `name` — Display name (e.g., `"Hub Engineer"`)
- `title` — Optional subtitle / role label
- `status` — Current status string (e.g., `"active"`, `"idle"`)
- `status_source` — Where the status was derived from (e.g., `"AGENTS.md"`, `"heartbeat"`)
- `agents_md_path` — Relative path to the agent's `AGENTS.md` file

#### `GET /api/v1/agents/:slug`

Fetch detail for a single agent.

**Response:**
```json
{
  "data": {
    "slug": "string",
    "name": "string",
    "title": "string | null",
    "status": "string",
    "status_source": "string",
    "agents_md_path": "string"
  }
}
```

Returns `404` if the agent slug is not found.

#### `GET /api/v1/docs`

List all documentation pages indexed by specrails-tech.

**Response:**
```json
{
  "data": [
    {
      "slug": "string",
      "title": "string",
      "path": "string",
      "updated_at": "string"
    }
  ]
}
```

Field descriptions:
- `slug` — URL-safe identifier (e.g., `"getting-started"`)
- `title` — Human-readable page title
- `path` — Relative file path on disk
- `updated_at` — ISO 8601 timestamp of last modification

#### `GET /api/v1/docs/:page`

Fetch a single documentation page by slug.

**Response:**
```json
{
  "data": {
    "slug": "string",
    "title": "string",
    "path": "string",
    "updated_at": "string",
    "content": "string"
  }
}
```

Returns `404` if the page slug is not found.

### Error Responses

All endpoints follow the same error envelope:

```json
{ "error": "string" }
```

HTTP status codes: `400` Bad Request, `404` Not Found, `500` Internal Server Error.

### Connectivity Model

The Hub proxy server (`specrails-hub`) calls specrails-tech synchronously on inbound requests. If specrails-tech is unreachable (ECONNREFUSED, timeout), the hub returns a structured response indicating the service is offline — it does **not** crash or return a 5xx to the client.

Hub proxy response when specrails-tech is offline:

```json
{
  "connected": false,
  "error": "specrails-tech is not running"
}
```

Hub proxy response when specrails-tech is reachable:

```json
{
  "connected": true,
  "data": { ... }
}
```

## Drawbacks

- The Hub dashboard depends on specrails-tech being locally running to show agent data. If it's not running, panels are empty (with a clear message).
- No authentication on v1 — this is localhost-only.

## Alternatives

- **Embed agent data in the hub**: rejected — creates duplication and divergence.
- **WebSocket push from specrails-tech**: rejected — adds complexity; polling is sufficient for v1.
- **Direct client → specrails-tech fetch**: rejected — requires CORS configuration and couples the client to port 3000 directly.
