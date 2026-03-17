---
name: "Compatibility Impact Analyzer"
description: "Snapshot the current API surface and detect breaking changes against a prior baseline. Generates a migration guide when breaking changes are found."
category: Workflow
tags: [workflow, compatibility, breaking-changes, migration]
---

Analyze the API surface of **specrails-hub** for backwards compatibility. Extracts the current contract surface (REST API routes, WebSocket message types, CLI command flags, Express route signatures, DB migration schemas), compares against a stored baseline, classifies each change by severity, and generates a migration guide when breaking changes are found.

**Input:** `$ARGUMENTS` — optional flags:
- `--diff` — compare current surface to most recent snapshot (default when snapshots exist)
- `--snapshot` — capture current surface and save without diffing (default on first run)
- `--since <date>` — diff against snapshot from this date (ISO format: YYYY-MM-DD)
- `--propose <change-dir>` — diff proposed changes in `openspec/changes/<change-dir>/` against current surface
- `--dry-run` — run all phases but skip saving the snapshot

---

## Phase 0: Argument Parsing

Parse `$ARGUMENTS` to set runtime variables.

**Variables to set:**

- `MODE` — string, one of `"snapshot"`, `"diff"`, `"propose"`. Default: `"diff"` if `.claude/compat-snapshots/` contains any `.json` files; `"snapshot"` otherwise.
- `COMPARE_DATE` — string (ISO date) or empty string. Default: `""` (use most recent snapshot).
- `PROPOSE_DIR` — string or empty string. Default: `""`.
- `DRY_RUN` — boolean. Default: `false`.

**Parsing rules:**

1. Scan `$ARGUMENTS` for `--snapshot`. If found, set `MODE=snapshot`.
2. Scan for `--diff`. If found, set `MODE=diff`.
3. Scan for `--since <date>`. If found, set `COMPARE_DATE=<date>` and (if `MODE` not already set to `snapshot`) set `MODE=diff`.
4. Scan for `--propose <change-dir>`. If found, set `PROPOSE_DIR=<change-dir>` and `MODE=propose`.
   - Verify `openspec/changes/<change-dir>/` exists. If not: print `Error: no change found at openspec/changes/<change-dir>/` and stop.
5. Scan for `--dry-run`. If found, set `DRY_RUN=true`.
6. Apply default-mode logic if `MODE` is not yet set: check whether `.claude/compat-snapshots/` exists and contains `.json` files. If yes: `MODE=diff`. If no: `MODE=snapshot`.

**Print active configuration:**

```
Mode: <MODE> | Compare date: <COMPARE_DATE or "latest"> | Dry-run: <true/false>
```

---

## Phase 1: Extract Current Surface

Read the codebase and build the surface snapshot. Print one progress line as each category completes.

**Surface category: api_routes**

Read `server/hub-router.ts` and `server/project-router.ts`. Extract all Express route registrations:
- Pattern: `router.<method>('<path>', ...)` or `app.<method>('<path>', ...)`
- For each route, record: `method` (GET/POST/PUT/DELETE/PATCH), `path` (the string literal), `source_file`, `line_number`

Print: `  api_routes: N found`

**Surface category: websocket_messages**

Search all TypeScript files for WebSocket message type patterns:
- Look for string literals used as `type:` fields in objects sent via `ws.send()` or broadcast functions
- Look for `msg.type === '...'` or `message.type === '...'` comparisons in WS handler code

Print: `  websocket_messages: N found`

**Surface category: cli_commands**

Read `cli/` directory. Extract all command registrations (e.g., `program.command('...')`) and flags (`program.option('...', '...')`).

Print: `  cli_commands: N found`

**Surface category: db_migrations**

Read `server/db.ts`. Extract the `MIGRATIONS` array — each migration string is a surface item. Record: migration index, first 80 chars as description.

Print: `  db_migrations: N found`

**Surface category: hub_api_routes**

Read `server/hub-router.ts` specifically for hub-level routes (`/api/hub/*`). Record separately from project-scoped routes.

Print: `  hub_api_routes: N found`

**Build the surface object:**

Assemble all extracted data into a snapshot object matching the schema:

```json
{
  "schema_version": "1",
  "captured_at": "<ISO 8601 datetime>",
  "git_sha": "<git rev-parse HEAD or 'unknown'>",
  "git_branch": "<git rev-parse --abbrev-ref HEAD or 'unknown'>",
  "surfaces": {
    "api_routes": [...],
    "websocket_messages": [...],
    "cli_commands": [...],
    "db_migrations": [...],
    "hub_api_routes": [...]
  }
}
```

Set `CURRENT_SURFACE` to this object.

If `MODE=snapshot`: proceed directly to Phase 5 (skip Phases 2–4 diff logic, but still print a surface summary).

---

## Phase 2: Load Baseline

Applies in `diff` and `propose` modes only.

**For `diff` mode:**

1. Check whether `.claude/compat-snapshots/` exists and contains `.json` files.
   - If empty or missing: print `Advisory: no prior snapshot found. Switching to snapshot mode.` Set `MODE=snapshot`. Proceed to Phase 5.
2. If `COMPARE_DATE` is empty: select the most recently modified `.json` file.
3. If `COMPARE_DATE` is set: find the snapshot whose filename date is closest to `COMPARE_DATE` without exceeding it. If no match within 7 days: print `Warning: no snapshot found near <COMPARE_DATE>. Falling back to most recent.` Use most recent.
4. Load the selected file as `BASELINE_SURFACE`.
5. Print: `Baseline: <YYYY-MM-DD> (<sha from filename>)`

**For `propose` mode:**

1. Load the most recent snapshot from `.claude/compat-snapshots/` as `BASELINE_SURFACE` (same selection logic as `diff` mode with `COMPARE_DATE` empty).
2. Additionally read `openspec/changes/<PROPOSE_DIR>/design.md` to understand the projected surface changes.
   - If `design.md` does not exist: print `Warning: no design.md found in openspec/changes/<PROPOSE_DIR>/. Proceeding with surface extraction only (no projection).`
   - If it exists: read also `openspec/changes/<PROPOSE_DIR>/tasks.md` if present.
3. Use the proposed changes to project the "after" surface: identify which elements would be added, removed, or modified based on the design document.
4. Print: `Propose mode: analyzing openspec/changes/<PROPOSE_DIR>/`

Set `BASELINE_SURFACE` and `PROJECTED_CHANGES` (in propose mode).

---

## Phase 3: Diff and Classify

Applies in `diff` and `propose` modes. Skipped in `snapshot` mode.

For each surface category (`api_routes`, `websocket_messages`, `cli_commands`, `db_migrations`, `hub_api_routes`):

1. Build identifier sets from baseline and current (or projected, in propose mode).
2. Compute:
   - `removed = identifiers in baseline but not in current`
   - `added = identifiers in current but not in baseline`
   - `common = identifiers in both`
3. For common elements: check whether attributes changed (method, path signature, flag names). Classify attribute changes as Category 3 (Signature Change) if they affect the interface.
4. Classify each removal:
   - If a similar-looking name appears in `added`: classify as **Category 2: Rename** (BREAKING — MAJOR)
   - Otherwise: classify as **Category 1: Removal** (BREAKING — MAJOR)
5. Classify additions as non-breaking (new additions do not break existing callers).
6. Classify behavioral changes detected from the design document (in propose mode) as **Category 4: Behavioral Change** (ADVISORY).

Build two lists:
- `BREAKING_CHANGES` — list of `{ category, element, surface, severity, description }` objects (Categories 1, 2, 3)
- `ADVISORY_CHANGES` — list of `{ category, element, surface, description }` objects (Category 4)

---

## Phase 4: Generate Report

Print the full compatibility report.

```
## Compatibility Impact Report — specrails-hub
Date: <ISO date> | Commit: <git_short_sha or "unknown">

### Surface Snapshot
| Category | Elements Found |
|----------|---------------|
| API routes (project-scoped) | N |
| API routes (hub-scoped) | N |
| WebSocket message types | N |
| CLI commands & flags | N |
| DB migrations | N |

### Breaking Changes (N found)
<if BREAKING_CHANGES is empty:>
None detected.

<if BREAKING_CHANGES is non-empty, for each:>
- [Category <N>: <category-name>] <surface>: `<element>` — <description>

### Advisory Changes (N found)
<if ADVISORY_CHANGES is empty:>
None detected.

<if ADVISORY_CHANGES is non-empty, for each:>
- [Category 4: Behavioral Change] <surface>: `<element>` — <description>
```

**Migration Guide** (only when `len(BREAKING_CHANGES) > 0`):

For each breaking change, append a Migration Guide block:

```
## Migration Guide

**Change type:** <Removal | Rename | Signature Change>
**Severity:** BREAKING
**Affects:** <who is affected>

### What Changed
<one paragraph describing before and after>

### Before
<concrete example of old usage>

### After
<concrete example of new usage>

### Remediation Options

**Option A — Backwards-compatible alias (recommended)**
<how to add an alias or shim>

**Option B — Clean break with changelog**
<what to put in CHANGELOG.md>

### Version Strategy
<MAJOR bump if removing/renaming; MINOR if signature-only>
```

---

## Phase 5: Save Snapshot

**If `DRY_RUN=true`:**

Print: `Snapshot not saved — dry-run mode`

Skip the save. Still perform the housekeeping check and `.gitignore` check below.

**If `DRY_RUN=false`:**

1. Determine filename: `<YYYY-MM-DD>-<git_short_sha>.json`. If git is unavailable: `<YYYY-MM-DD>-unknown.json`.
2. Create `.claude/compat-snapshots/` if it does not exist.
3. Write `CURRENT_SURFACE` serialized as JSON to `.claude/compat-snapshots/<filename>`.
4. Print: `Snapshot saved: .claude/compat-snapshots/<filename>`

**Housekeeping notice:**

Count `.json` files in `.claude/compat-snapshots/`. If count > 30, print:

```
Note: .claude/compat-snapshots/ has N snapshots. Consider pruning old ones with:
  ls -t .claude/compat-snapshots/ | tail -n +31 | xargs -I{} rm .claude/compat-snapshots/{}
```

**.gitignore suggestion:**

Check whether `.claude/compat-snapshots/` appears in `.gitignore` (if `.gitignore` exists). If it does not appear, print:

```
Tip: compat snapshots are local artifacts. Add to .gitignore:
  echo '.claude/compat-snapshots/' >> .gitignore
```
