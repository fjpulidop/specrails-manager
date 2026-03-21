# Features

A reference guide to every feature available in the specrails-hub dashboard.

---

## Dashboard

**Route:** `/` (project home)

The Dashboard is the main view for a project. It combines the command launcher, a live job feed, and pipeline status in one place.

**What you see:**

- **CommandGrid** — organized into two sections:
  - **DISCOVERY** — commands for exploring and defining product work (propose-spec, auto-propose specs, auto-select specs). Click to run immediately; a toast notification confirms the job was queued.
  - **DELIVERY** — commands for building and shipping features (implement, batch-implement). These open a guided wizard to confirm parameters before running.
  - **Others** — additional installed commands, collapsed by default.
- **Recent Jobs** — a live-updating table of the last 10 jobs for the project: command, start time, duration, exit code, token cost. Click any row to open the full log.
- **Pipeline phase indicator** — shows which phase (Architect / Developer / Reviewer / Ship) is currently active, with states: idle, running, done, or failed.
- **HubTodayWidget** — hub-level summary of today's activity across all projects.
- **ProjectHealthWidget** — key health signals for the current project.

The Dashboard uses stale-while-revalidate caching — switching projects is instant, with fresh data loading in the background.

---

## Analytics

**Route:** `/analytics`

Quantitative view of AI pipeline activity over time.

**Metrics available:**

| Metric | Description |
|--------|-------------|
| Total jobs | Count of all completed jobs |
| Success rate | Percentage of jobs that exited with code 0 |
| Total tokens | Sum of input + output tokens across all jobs |
| Total cost | Estimated cost in USD based on Claude pricing |
| Avg duration | Mean job duration in seconds |
| Throughput | Jobs completed per day over the selected period |

Charts display token usage and cost trends, making it easy to spot expensive or long-running phases.

---

## Activity Feed

**Route:** `/activity`

A chronological log of every pipeline event in the project — not just the current session.

**Event types:**

- Job started / completed / failed
- Phase transitions (Architect started, Developer completed, etc.)
- Setup wizard events (installation started, completed)
- Project settings changes

Each event entry includes a timestamp, event type, and a brief description. Click any job event to jump to its full log.

---

## Chat

**Location:** Sidebar panel in the project layout

A persistent Claude conversation scoped to the active project. Claude has the project directory as its working context.

**Key behaviors:**
- Conversation history persists across dashboard sessions
- Each project has its own independent chat history
- Slash commands trigger pipeline actions directly from chat (see [Workflows](workflows.md) for the full command list)
- The chat panel is always visible in the project sidebar — no navigation needed

**Use the chat to:**
- Ask Claude to explain a part of the codebase
- Request a quick analysis without queuing a full job
- Run diagnostic commands (`/sr:health-check`, `/sr:why`)
- Plan features before queuing an implementation job

---

## Jobs

**Route:** `/jobs`

Historical record of every Claude invocation for the project.

**Per-job information:**

| Field | Description |
|-------|-------------|
| ID | Short job ID (first 8 chars of UUID) |
| Command | The command that was run |
| Started | Date and time the job was spawned |
| Duration | Total wall-clock time |
| Exit code | 0 = success, non-zero = failure |
| Tokens | Total input + output tokens |
| Cost | Estimated USD cost |

Click any job row to expand the full log output for that job.

From the CLI, you can also view recent jobs:

```bash
specrails-hub --jobs
```

---

## Multi-project navigation

**Location:** Tab bar in the top navigation

specrails-hub manages all your projects from one server. Switch between projects using the tab bar at the top of the page (or the project switcher dropdown).

**On project switch:**
- Cached data is shown immediately — no flicker
- Fresh data is fetched in the background
- The chat panel switches to the new project's conversation history
- The URL updates to reflect the active project

---

## Project setup wizard

Activated automatically when adding a project that does not have specrails-core installed.

**Phases:**

1. **Path confirmation** — verify the project directory
2. **Installation proposal** — the hub shows what will be installed and asks for confirmation
3. **Installation** — runs `npx specrails-core` with a live log stream
4. **Setup chat** — a `/setup` conversation with Claude configures the project for your codebase
5. **Completion** — summary of what was set up; the project is now ready

You can trigger the wizard manually by removing specrails-core from a project and re-adding it via the dashboard.

---

## Docs Portal

**Route:** `/docs`

Embedded documentation browser for the hub itself. Docs are sourced from `docs/` in the repository and served at runtime.

---

## Settings

**Location:** Gear icon (⚙) in the top navigation bar

Opens the global settings modal. From here you can:
- View and edit global hub configuration
- See all registered projects
- Remove projects from the hub
