# specrails-hub MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes specrails-hub to Claude Desktop and any MCP-compatible client.

## What it exposes

### Resources

| URI | Description |
|-----|-------------|
| `specrails://hub/projects` | All registered projects |
| `specrails://hub/projects/{projectId}` | Project detail + quick stats |
| `specrails://hub/projects/{projectId}/jobs` | Recent jobs (last 50) |
| `specrails://hub/projects/{projectId}/jobs/{jobId}` | Job detail with event log |
| `specrails://hub/analytics` | Hub-wide analytics (last 30 days) |
| `specrails://hub/projects/{projectId}/analytics` | Per-project analytics |

### Tools

| Tool | Description |
|------|-------------|
| `hub_status` | Check if hub server is running and healthy |
| `list_projects` | List all registered projects (JSON) |
| `get_jobs` | List jobs for a project with filtering and pagination |
| `get_job_detail` | Get a specific job with full event log |
| `get_analytics` | Get cost/usage analytics (hub-wide or per-project) |
| `enqueue_job` | Trigger a new AI job in a project (requires hub server running) |

## Setup

### Build

```bash
cd mcp
npm install
npm run build
```

### Claude Desktop configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "specrails-hub": {
      "command": "node",
      "args": ["/path/to/specrails-hub/mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/specrails-hub` with the actual path to your specrails-hub checkout.

### Development (without building)

```bash
cd mcp
npm run dev
```

## Requirements

- specrails-hub must have been started at least once (to create `~/.specrails/hub.sqlite`)
- For `enqueue_job`, the hub server must be running at `http://localhost:4200`
- `better-sqlite3` must be available (installed at the monorepo root)

## Architecture

The MCP server reads directly from SQLite databases for maximum performance:

- `~/.specrails/hub.sqlite` — project registry
- `~/.specrails/projects/<slug>/jobs.sqlite` — per-project job data

The `enqueue_job` tool calls the hub HTTP API at `http://localhost:4200` to queue jobs through the proper queue manager.
