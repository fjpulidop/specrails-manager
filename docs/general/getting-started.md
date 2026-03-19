# Getting Started

Welcome to the specrails documentation portal.

This is your company's central documentation hub. Docs are organized into four categories:

- **Engineering** — RFCs, technical standards, architecture decisions
- **Product** — Roadmaps, PRDs, feature specs
- **Operations** — Runbooks, deployment guides, on-call procedures
- **General** — Company-wide docs, onboarding, policies

## Adding Documentation

Add Markdown files to the `~/.specrails/docs/` directory, organized by category:

```
~/.specrails/docs/
  engineering/
    my-rfc.md
  product/
    my-prd.md
  operations/
    my-runbook.md
  general/
    my-doc.md
```

Each file becomes a document with a clean URL like `/docs/engineering/my-rfc`.

## Markdown Features

The portal supports standard Markdown with:

- **Tables** — pipe syntax
- **Code blocks** — fenced with syntax highlighting
- **Lists** — ordered and unordered
- **Links** — inline and reference style

### Code Example

```typescript
import { specrails } from 'specrails-core'

const pipeline = specrails.createPipeline({
  phases: ['architect', 'developer', 'reviewer', 'ship'],
})

await pipeline.run()
```

### Table Example

| Phase | Description | Agent |
|-------|-------------|-------|
| Architect | Design the solution | sr-architect |
| Developer | Implement the code | sr-developer |
| Reviewer | Review and fix | sr-reviewer |
| Ship | Deploy to production | sr-shipper |
