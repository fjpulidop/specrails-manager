# Persona: Alex Chen

> "I have five projects in flight. I just want to know which ones are blocked."

## Profile

| Field | Value |
|-------|-------|
| **Name** | "Alex" — The Multi-Project Developer |
| **Age** | 28–40 |
| **Role** | Full-stack developer, contractor, or startup engineer |
| **Stack** | TypeScript, React, Node.js — heavy Claude Code user |
| **Spending** | $100–300/month on Claude API across multiple projects |
| **Tools** | Claude Code, specrails, VS Code, GitHub Issues, Linear |

## Behaviors

- Maintains 3–6 active repos simultaneously (client work + side projects + open-source)
- Opens and closes terminal tabs per-project, frequently loses track of which pipeline is running where
- Checks job status by re-running commands and reading terminal output
- Manually tracks which Claude sessions succeeded or burned tokens on a failed run
- Relies on specrails phases (Architect → Developer → Reviewer → Ship) but has no unified view
- Tends to over-spend on one project while another is idle — only realizes when checking the bill

## Value Proposition Canvas

### Customer Jobs

| Type | Job |
|------|-----|
| Functional | See the status of all active AI pipelines in one place |
| Functional | Queue and launch specrails commands per-project from a single UI |
| Functional | Review logs and job history across projects without switching terminals |
| Functional | Switch context between projects without losing state |
| Social | Look in control when showing work to clients or collaborators |
| Emotional | Feel confident that no job is silently failing in the background |
| Functional | Understand which project is consuming the most AI cost |
| Functional | Resume a failed job quickly with context on why it failed |

### Pains

| Severity | Pain |
|----------|------|
| Critical | No unified dashboard — must check each project separately via terminal |
| Critical | Silent failures: a pipeline fails in a background tab with no notification |
| High | Context-switching overhead — terminal, logs, editor all per-project |
| High | No easy way to see what Claude ran, what it cost, or how long it took |
| High | Queue collisions when two specrails commands fight over the same process |
| Medium | Hard to compare pipeline performance across projects |
| Medium | Log output is ephemeral — terminal history doesn't persist after restart |
| Low | Setting up specrails for a new project is fiddly and undocumented |

### Gains

| Impact | Gain |
|--------|------|
| High | Browser-style project tabs — one app, all projects, instant context switch |
| High | Real-time job status with phase indicators (which phase is active right now) |
| High | Persistent log history per job — searchable, shareable |
| High | One-click command launcher without touching the terminal |
| Medium | Analytics: cost, tokens, duration per project over time |
| Medium | Setup wizard for new projects — guided specrails onboarding |
| Medium | Job queue with pause/resume so commands don't stomp each other |
| Low | Chat with Claude scoped to a specific project's context |

## Key Insight

> Multi-project developers waste significant time on context-switching and status-checking. The #1 unmet need is a **single-pane-of-glass** for all active AI pipelines — not smarter AI, just better visibility.

## Sources

- [Best AI Coding Agents 2026 — Faros AI](https://www.faros.ai/blog/best-ai-coding-agents-2026)
- [Top 12 AI Developer Tools 2026 — Checkmarx](https://checkmarx.com/learn/ai-security/top-12-ai-developer-tools-in-2026-for-security-coding-and-quality/)
- [Claude Code Multiple Agent Systems — eesel.ai](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)
