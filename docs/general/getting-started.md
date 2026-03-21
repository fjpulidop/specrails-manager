# Getting Started with specrails-hub

specrails-hub is a local dashboard and CLI for managing multiple [specrails-core](https://github.com/fjpulidop/specrails-core) projects from a single interface.

---

## Quick Start

### 1. Install

```bash
npm install -g specrails-hub
```

### 2. Start the hub

```bash
specrails-hub start
```

### 3. Register a project

```bash
specrails-hub add /path/to/your/project
```

### 4. Open the dashboard

```bash
open http://localhost:4200
```

On first launch with no projects, you'll see a welcome screen with an **Add your first project** button.

---

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **claude** CLI on your PATH ([Claude Code](https://claude.ai/claude-code))
- At least one project with specrails-core installed (`npx specrails-core`)

---

## Dashboard overview

```
┌─────────────────────────────────────────────────────────────┐
│  specrails hub   [my-app ●] [api-srv] [+]              ⚙   │
│  Home   Analytics   Activity                                │
│─────────────────────────────────────────────────────────────│
│  DISCOVERY                  DELIVERY                        │
│  [Propose Spec]             [Implement →]                   │
│  [Auto-propose Specs]       [Batch Implement →]             │
│  [Auto-select Specs]                                        │
│                                                             │
│  Recent Jobs                                                │
│  /sr:implement #42   2m 4s   ✓   $0.08   12,400 tok        │
└─────────────────────────────────────────────────────────────┘
```

- **Tabs** — one per project, green dot when a job is active
- **Home** — CommandGrid (DISCOVERY + DELIVERY sections), recent jobs, pipeline status
- **Analytics** — cost, token, and duration metrics
- **Activity** — chronological event log
- **Settings** (gear icon) — global hub configuration and registered projects

---

## CLI reference (quick)

| Command | Description |
|---------|-------------|
| `specrails-hub start` | Start the hub server |
| `specrails-hub stop` | Stop the hub server |
| `specrails-hub list` | List all registered projects |
| `specrails-hub add <path>` | Register a project |
| `specrails-hub remove <id>` | Unregister a project |
| `specrails-hub implement "#42"` | Run an implement job (auto-detects project from CWD) |
| `specrails-hub --jobs` | Show recent job history |

---

## Documentation index

| Document | What it covers |
|----------|---------------|
| [Features](../product/features.md) | Dashboard feature reference (CommandGrid, jobs, analytics, chat) |
| [Workflows](../product/workflows.md) | Step-by-step task guides |
| [OpenSpec Workflow](../product/openspec-workflow.md) | `opsx:*` CLI commands for structured change management |
| [Architecture](../engineering/architecture.md) | System architecture, data layout, WebSocket protocol |
| [API Reference](../engineering/api-reference.md) | REST API endpoint reference |
| [Engineering Standards](../engineering/engineering-standards.md) | Coding conventions, testing, RFC format |
| [Operations Runbook](../operations/runbook.md) | Deployment and incident response |
| [Platform Overview](platform-overview.md) | High-level product overview |

---

## Adding documentation

Markdown files in `docs/` are served by the embedded docs portal at `http://localhost:4200/docs`. Add files to the appropriate category directory:

```
docs/
  engineering/   # RFCs, architecture, technical standards
  product/       # Roadmaps, PRDs, feature specs
  operations/    # Runbooks, on-call procedures
  general/       # Onboarding, platform overview
```

Each file becomes a URL like `/docs/engineering/my-rfc`.
