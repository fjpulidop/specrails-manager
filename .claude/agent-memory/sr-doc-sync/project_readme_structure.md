---
name: README structure confirmed
description: Confirmed sections and style conventions of the root README.md for specrails-hub
type: project
---

README.md at project root contains these sections in order:
- Features (bullet list, `**Bold lead**` style)
- Prerequisites
- Installation
- Quick Start
- Architecture
- UI Overview
- CLI: `srm` (with sub-tables)
- API (with Hub routes and Project-scoped routes tables)
- Development
- WebSocket (message type table)
- Security
- License

**Why:** Needed as a stable reference so future doc-sync runs don't re-read the full README to locate sections.

**How to apply:** When a new feature needs documenting, check against this list to find the right section. Features bullet goes in Features; new routes go in API tables; new WS messages go in the WebSocket table; new CLI flags go in the CLI Options table.

No CHANGELOG.md exists at the project root — skip changelog updates unless it is created.

API docs are inline in README.md, not in a separate docs/ directory.
