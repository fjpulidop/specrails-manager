# Persona: Morgan Park

> "My team is using Claude Code on everything. I have no idea what any of it costs or whether it's working."

## Profile

| Field | Value |
|-------|-------|
| **Name** | "Morgan" — The Tech Lead |
| **Age** | 32–45 |
| **Role** | Engineering lead, senior dev, or CTO at a small team (2–8 engineers) |
| **Stack** | TypeScript/Python polyglot, manages multiple repos and environments |
| **Spending** | $500–2000/month on Claude API across the team |
| **Tools** | Claude Code, specrails, GitHub, Linear/Jira, Slack, Grafana |

## Behaviors

- Responsible for AI tooling decisions and budget accountability
- Checks in on team pipeline runs by asking in Slack or checking GitHub PRs — no native visibility
- Discovers failed specrails runs when a developer reports a blocker, not proactively
- Must manually aggregate cost data from individual developer accounts each billing cycle
- Runs retros on AI usage efficiency anecdotally ("it felt slow this sprint") not from data
- Wants to standardize specrails workflows across the team but has no governance tooling

## Value Proposition Canvas

### Customer Jobs

| Type | Job |
|------|-----|
| Functional | Get a cross-team view of all registered projects and their pipeline health |
| Functional | Track aggregate AI costs per project and per developer |
| Functional | Identify which projects are over-using or under-using AI pipelines |
| Functional | Standardize specrails command configurations across multiple repos |
| Social | Report AI tooling ROI to engineering managers or investors |
| Emotional | Feel confident the team's AI usage is productive, not wasteful |
| Functional | Detect and respond to stalled or failed pipelines without waiting for reports |
| Functional | Onboard new team members to the specrails workflow quickly |

### Pains

| Severity | Pain |
|----------|------|
| Critical | Zero observability into team-wide AI pipeline activity — all blind spots |
| Critical | Budget overruns discovered after the monthly bill arrives, not during the run |
| High | No standardized way to see which version of specrails commands each project uses |
| High | Onboarding a new dev to specrails takes 1–2 days of tribal knowledge transfer |
| High | Code review burden from AI-generated PRs — hard to scale oversight |
| Medium | Can't correlate AI spend to shipped features or sprint velocity |
| Medium | Different developers use different specrails configurations — inconsistent quality |
| Low | No audit trail of which AI jobs ran, when, and at what cost |

### Gains

| Impact | Gain |
|--------|------|
| High | Hub view: all registered projects in one dashboard, pipeline status at a glance |
| High | Analytics aggregated across projects: total cost, tokens, duration trends |
| High | Setup wizard that standardizes specrails config at project onboarding time |
| High | WebSocket-based real-time alerts when any pipeline enters a failed state |
| Medium | Per-project analytics so you can identify outliers in cost or duration |
| Medium | Job history with full logs — useful for incident post-mortems |
| Medium | Chat interface scoped per-project for quick team communication with Claude |
| Low | Export-friendly data for budget reports or stakeholder presentations |

## Key Insight

> Tech leads adopt AI coding tools reactively and lack any governance layer. The #1 unmet need is **cross-project observability and cost accountability** — a shared dashboard that makes the team's AI activity as visible as a CI/CD status board.

## Sources

- [Claude Code Agent Teams 2026 — claudefa.st](https://claudefa.st/blog/guide/agents/agent-teams)
- [Claude Code Token Limits for Engineering Leaders — Faros AI](https://www.faros.ai/blog/claude-code-token-limits)
- [5 Ways Claude Code Is Changing Digital Agencies 2026 — AdventurePPC](https://www.adventureppc.com/blog/5-ways-claude-code-is-changing-how-digital-agencies-work-in-2026)
