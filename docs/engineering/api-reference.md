# API Reference

All endpoints are under the Express server at `http://127.0.0.1:4200`. Requests and responses are JSON.

---

## Hub routes — `/api/hub/*`

Hub-level operations that are not scoped to a specific project.

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/projects` | List all registered projects |
| POST | `/api/hub/projects` | Register a new project |
| DELETE | `/api/hub/projects/:id` | Unregister a project |

**POST /api/hub/projects**

```json
// Request
{ "path": "/absolute/path/to/project", "name": "optional name" }

// Response 201
{ "project": { "id": "...", "slug": "my-app", "name": "my-app", "path": "..." }, "has_specrails": true }

// Error 400: path missing, path does not exist, or system directory
// Error 409: path already registered
```

**DELETE /api/hub/projects/:id**

Unregisters the project from the hub. Does not delete the project directory or its specrails-core installation.

---

### Hub state

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/state` | Hub version, project count, uptime |
| GET | `/api/hub/resolve?path=<p>` | Find a registered project by filesystem path |

**GET /api/hub/state**

```json
{
  "mode": "hub",
  "version": "x.y.z",
  "projectCount": 3,
  "uptime": 12345
}
```

**GET /api/hub/resolve?path=/path/to/project**

Returns the project entry if the given path matches a registered project (exact or parent-path match). Used by the CLI to auto-detect which project to route commands to.

---

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/settings` | Read global hub settings |
| PUT | `/api/hub/settings` | Update a global hub setting |

**PUT /api/hub/settings**

```json
{ "key": "setting_name", "value": "setting_value" }
```

---

### Analytics (hub-level)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/analytics` | Aggregated metrics across all projects |
| GET | `/api/hub/recent-jobs` | Recent jobs across all projects |
| GET | `/api/hub/search?q=<term>` | Search jobs and events across all projects |

---

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/agents` | List all configured agents |
| GET | `/api/hub/agents/:id` | Get a single agent |
| POST | `/api/hub/agents` | Create an agent entry |
| PATCH | `/api/hub/agents/:id` | Update an agent |

---

### specrails-tech proxy

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/specrails-tech/status` | specrails-tech API connectivity check |
| GET | `/api/hub/specrails-tech/agents` | List agents from specrails-tech |
| GET | `/api/hub/specrails-tech/agents/:slug` | Get a specific agent |
| GET | `/api/hub/specrails-tech/docs` | List specrails-tech docs |
| GET | `/api/hub/specrails-tech/docs/:page` | Get a specific doc page |

---

### Compatibility

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hub/core-compat` | Check specrails-core version compatibility |

---

## Project-scoped routes — `/api/projects/:projectId/*`

All routes below are prefixed with `/api/projects/:projectId/`. In the client, use `getApiBase()` as the prefix (it automatically injects the active project ID).

### Commands

| Method | Path | Description |
|--------|------|-------------|
| POST | `/spawn` | Queue a command job |
| GET | `/config` | List available `/sr:*` commands |
| POST | `/config` | Refresh command discovery |

**POST /spawn**

```json
// Request
{ "command": "/sr:implement #42" }

// Response 200
{ "jobId": "uuid", "status": "queued" }
```

---

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List job history (`?limit=N&offset=N`) |
| GET | `/jobs/:id` | Get a single job with full log |
| DELETE | `/jobs/:id` | Cancel a running job |
| DELETE | `/jobs` | Clear all completed jobs |
| GET | `/jobs/compare` | Compare metrics between two jobs |

**GET /jobs**

```json
{
  "jobs": [
    {
      "id": "uuid",
      "command": "/sr:implement #42",
      "started_at": "2026-03-21T00:00:00Z",
      "duration": 272,
      "exit_code": 0,
      "tokens": 12400,
      "cost": 0.08,
      "status": "completed"
    }
  ]
}
```

---

### Queue

| Method | Path | Description |
|--------|------|-------------|
| GET | `/queue` | Current queue state |
| POST | `/queue/pause` | Pause the job queue |
| POST | `/queue/resume` | Resume the job queue |
| PUT | `/queue/reorder` | Reorder queued jobs |

---

### State and activity

| Method | Path | Description |
|--------|------|-------------|
| GET | `/state` | Current project runtime state (active job, queue depth) |
| GET | `/activity` | Chronological event log |
| GET | `/issues` | GitHub issues linked to the project |

---

### Analytics (project-level)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics` | Aggregated metrics for this project |
| GET | `/stats` | Summary stats (total jobs, tokens, cost) |
| GET | `/metrics` | Raw metrics data |
| GET | `/trends` | Time-series data for cost and tokens |

---

### Chat

| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/conversations` | List all conversations |
| POST | `/chat/conversations` | Create a new conversation |
| GET | `/chat/conversations/:id` | Get a conversation |
| DELETE | `/chat/conversations/:id` | Delete a conversation |
| PATCH | `/chat/conversations/:id` | Update conversation metadata |
| GET | `/chat/conversations/:id/messages` | List messages |
| POST | `/chat/conversations/:id/messages` | Send a message (streaming) |
| DELETE | `/chat/conversations/:id/messages/stream` | Cancel an in-progress message |

---

### Setup wizard

| Method | Path | Description |
|--------|------|-------------|
| POST | `/setup/install` | Start specrails-core installation |
| POST | `/setup/start` | Begin the setup chat phase |
| POST | `/setup/message` | Send a message during setup chat |
| GET | `/setup/checkpoints` | List setup checkpoint states |
| POST | `/setup/abort` | Abort the setup wizard |

---

### Proposals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/propose` | List spec proposals |
| POST | `/propose` | Create a new proposal |
| GET | `/propose/:id` | Get a proposal |
| POST | `/propose/:id/refine` | Refine a proposal with feedback |
| POST | `/propose/:id/create-issue` | Convert proposal to GitHub issue |
| DELETE | `/propose/:id` | Delete a proposal |

---

### OpenSpec changes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/changes` | List active changes in `.specrails/changes/` |
| GET | `/changes/:changeId/artifacts/:artifact` | Get a specific change artifact |

---

### Spec launcher

| Method | Path | Description |
|--------|------|-------------|
| POST | `/spec-launcher/start` | Start the batch spec launcher |
| DELETE | `/spec-launcher/:launchId` | Cancel a spec launcher run |

---

## WebSocket

Connect to `ws://127.0.0.1:4200`. The server broadcasts all events over a single connection. Filter by `projectId` on the client.

See [Architecture](architecture.md#websocket-protocol) for the full message type reference.
