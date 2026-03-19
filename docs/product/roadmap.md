# Product Roadmap

This document outlines the product direction for specrails.

## Vision

Enable any development team to ship production-quality features with AI agents — from idea to code, with full visibility and control.

## Current Quarter

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Documentation portal (`/docs`) | In Progress |
| P0 | Multi-project hub mode | Done |
| P1 | Setup wizard for new projects | Done |
| P1 | Batch implementation pipeline | Done |
| P2 | Analytics dashboard | Done |

## Next Quarter

- **Agent coordination** — multiple agents working on the same project in parallel
- **Review queue** — structured PR review workflow with agent comments
- **Notifications** — Slack/email alerts for pipeline completions and failures
- **Project templates** — starter configs for common project types

## Backlog

- GitHub Actions integration (trigger pipelines from PRs)
- Time-based scheduling (cron jobs for pipeline phases)
- Cost tracking per project/pipeline
- Multi-user support with role-based access

## Principles

1. **Local first** — everything runs on your machine, your data stays yours
2. **Transparent** — full visibility into what agents are doing and why
3. **Composable** — plug in your own commands, phases, and agents
4. **Fast** — sub-second feedback, minimal latency in the pipeline
