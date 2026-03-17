# Persona: Sam Rivera

> "I spent $40 on a Claude run that failed halfway through. I didn't even know until I checked my bill."

## Profile

| Field | Value |
|-------|-------|
| **Name** | "Sam" — The Solo Dev |
| **Age** | 22–35 |
| **Role** | Indie hacker, freelancer, or solo founder |
| **Stack** | Varies — primarily TypeScript or Python, shipping fast |
| **Spending** | $50–200/month on Claude API, very cost-sensitive |
| **Tools** | Claude Code, specrails, VS Code, GitHub, Notion |

## Behaviors

- Ships alone — no team to share costs or catch errors
- Runs specrails pipelines opportunistically: "let it run while I sleep / grab coffee"
- Checks costs by logging into the Anthropic billing dashboard once a week or after a big session
- Has no per-project cost breakdown — just a total monthly number
- Monitors pipeline progress by tailing terminal output or checking back manually
- Abandons failed jobs and re-runs from scratch due to lack of resume capability
- Has experienced unexpected bill spikes from runaway sessions or misconfigured commands

## Value Proposition Canvas

### Customer Jobs

| Type | Job |
|------|-----|
| Functional | Know the exact cost of each specrails run as it happens |
| Functional | See which project is consuming the most tokens per week |
| Functional | Monitor pipeline progress remotely (from phone or another tab) |
| Functional | Detect and cancel a runaway session before it burns too much budget |
| Emotional | Stop worrying about surprise bills every month |
| Emotional | Feel in control of AI spend without becoming a finance person |
| Functional | Resume or replay a failed job without starting over |
| Social | Share job analytics with clients to justify AI tooling costs |

### Pains

| Severity | Pain |
|----------|------|
| Critical | No real-time cost tracking per run — only post-hoc billing dashboard |
| Critical | Runaway sessions silently drain budget with no alerts or kill switches |
| High | No per-project cost breakdown — impossible to bill clients accurately |
| High | Terminal-only monitoring means you must stay at your desk to watch a run |
| High | Failed runs waste full token cost with no partial-save mechanism |
| Medium | Historical job data disappears when terminal closes or machine restarts |
| Medium | Can't easily compare costs between different specrails commands/strategies |
| Low | Specrails setup for new projects is manual and time-consuming |

### Gains

| Impact | Gain |
|--------|------|
| High | Live cost meter per job: see dollars spent tick up in real time |
| High | Per-project analytics: weekly spend, average cost per command, trends |
| High | Browser-based dashboard — monitor pipelines from any device |
| High | Kill switch: cancel an active job the moment it looks wrong |
| Medium | Persistent job history with cost, duration, and token breakdown per run |
| Medium | Analytics export (or visual charts) to justify costs to clients |
| Medium | Setup wizard that gets a new project running in under 5 minutes |
| Low | Conversation history with Claude scoped to each project |

## Key Insight

> Solo devs are the most cost-sensitive Claude Code users but have the least visibility into their spending. The #1 unmet need is a **real-time cost dashboard per project** — something that makes the economics of AI-assisted development as transparent as a ride-share fare estimate.

## Sources

- [Best Ways to Monitor Claude Code Token Usage and Costs 2026 — DEV Community](https://dev.to/kuldeep_paul/best-ways-to-monitor-claude-code-token-usage-and-costs-in-2026-5j3)
- [Claude Code Metrics Dashboard: Grafana Setup 2026 — Sealos](https://sealos.io/blog/claude-code-metrics/)
- [How to Track Claude Code Usage + Analytics — Shipyard](https://shipyard.build/blog/claude-code-track-usage/)
- [Manage Costs Effectively — Claude Code Docs](https://code.claude.com/docs/en/costs)
