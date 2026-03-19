# Engineering Standards

This document defines the engineering standards and conventions for all specrails projects.

## Code Style

- **TypeScript** everywhere — no `any` unless absolutely necessary
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **kebab-case** for file names (server/CLI), **PascalCase** for React components
- **No magic strings** — use constants or enums

## Testing

- Write tests for all critical paths
- Use `vitest` for unit and integration tests
- SQLite tests use `:memory:` databases — no test file cleanup needed
- Do not mock the database — use real SQLite `:memory:` instances

```typescript
// Good: real in-memory DB
const db = initDb(':memory:')

// Bad: mock
vi.mock('./db')
```

## Pull Requests

- Keep PRs small and focused
- Every PR needs a clear description of what changed and why
- CI must pass before merge (typecheck + vitest)
- One approving review required

## Architecture Decisions

All significant architecture decisions should be documented as RFCs in `docs/engineering/` before implementation.

### RFC Format

```markdown
# RFC: [Title]

## Status
Proposed | Accepted | Rejected | Superseded

## Summary
One paragraph summary.

## Motivation
Why are we doing this?

## Detailed Design
How does it work?

## Drawbacks
What are the trade-offs?

## Alternatives
What else was considered?
```

## Dependencies

- Prefer packages with low dependency footprint
- Audit new dependencies before adding: `npm audit`
- Pin major versions in `package.json`
- Server-side: no new ORM — use `better-sqlite3` directly
