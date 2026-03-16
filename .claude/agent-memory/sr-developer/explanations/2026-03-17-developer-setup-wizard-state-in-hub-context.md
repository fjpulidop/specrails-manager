---
agent: developer
feature: add-project-wizard
tags: [state-management, hub-context, wizard]
date: 2026-03-17
---

## Decision

Setup wizard state (`setupProjectIds`) lives in `HubContext` rather than in the router or a separate context.

## Why This Approach

The wizard needs to render as the full project view (replacing `ProjectLayout`), which happens at the `HubApp` routing level in `App.tsx`. `App.tsx` already consumes `useHub()`, so extending `HubContext` with `setupProjectIds` is the minimal change that gives `App.tsx` access to the wizard flag without adding another context layer.

## Alternatives Considered

- **URL-based state** (`/setup` route per project): Rejected because the wizard is transient onboarding state, not a bookmarkable page. Also, hub mode uses a flat route structure without per-project URL segments.
- **Separate `SetupContext`**: Rejected as unnecessary indirection — the state is simple (a Set of IDs) and the consumers are already HubContext consumers.
