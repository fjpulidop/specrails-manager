# RFC-003: Integration Contract — SpecRails-Core ↔ SpecRails-Hub Sync

**Status:** Draft
**Author:** CTO
**Date:** 2026-03-20
**Repos Affected:** specrails-core, specrails-hub

---

## Problem

SpecRails-Hub integrates with SpecRails-Core at three hardcoded coupling points:

| Coupling Point | Hub File | Risk When Core Changes |
|---|---|---|
| `CHECKPOINTS` array (7 stages) | `server/setup-manager.ts` | Hub misdetects installation completion |
| `KNOWN_VERBS` set (8 commands) | `cli/specrails-hub.ts` | Hub fails to inject `/sr:` prefix for new commands |
| CLI invocation signature | `server/setup-manager.ts` | Hub spawns wrong command if init args change |

Currently **no automated mechanism** notifies Hub when Core changes. The drift is silent: Hub can operate against a stale version of Core without any warning.

### Concrete Failure Scenarios

1. Core adds a new setup stage (e.g., `openapi_generation`). Hub's CHECKPOINTS doesn't include it — Hub reports "setup complete" before it actually is.
2. Core adds a new command (e.g., `generate-spec`). Hub's KNOWN_VERBS doesn't include it — users must type the full `/sr:generate-spec` instead of just `generate-spec`.
3. Core renames the `init` command to `bootstrap`. Hub spawns `npx specrails-core init --yes` and fails silently.

---

## Proposed Solution: Contract-Driven Sync

A three-pillar architecture that creates a machine-readable contract in Core and automated drift detection in Hub.

### Pillar 1: Integration Contract File (specrails-core)

Add `integration-contract.json` to the specrails-core npm package. This file is the **single source of truth** for the Hub integration interface.

```json
{
  "schemaVersion": "1.0",
  "coreVersion": "0.7.1",
  "minimumHubVersion": "1.3.0",
  "cli": {
    "initArgs": ["init", "--yes"],
    "updateArgs": ["update"]
  },
  "checkpoints": [
    "base_install",
    "repo_analysis",
    "stack_conventions",
    "product_discovery",
    "agent_generation",
    "command_config",
    "final_verification"
  ],
  "commands": [
    "implement",
    "batch-implement",
    "why",
    "product-backlog",
    "update-product-driven-backlog",
    "refactor-recommender",
    "health-check",
    "compat-check"
  ]
}
```

**Rules for evolving the contract:**
- Adding a new checkpoint: bump `coreVersion` (minor), no Hub breaking change.
- Removing a checkpoint: bump `minimumHubVersion` to current Hub version + 1 minor.
- Adding a command: bump `coreVersion` (minor), no Hub breaking change.
- Removing a command: bump `minimumHubVersion`.
- Changing `cli.initArgs`: treat as breaking — coordinate with Hub Engineer before merge.

### Pillar 2: Cross-Repo GitHub Actions Trigger

When specrails-core releases a new version, its `release.yml` dispatches an event to specrails-hub.

**In `specrails-core/.github/workflows/release.yml`** (add after npm publish step):

```yaml
- name: Notify specrails-hub of new release
  if: steps.release.outputs.release_created
  uses: peter-evans/repository-dispatch@v3
  with:
    token: ${{ secrets.HUB_DISPATCH_TOKEN }}
    repository: fjpulidop/specrails-hub
    event-type: specrails-core-released
    client-payload: '{"core_version": "${{ steps.release.outputs.tag_name }}"}'
```

**In `specrails-hub/.github/workflows/sync-core-contract.yml`** (new file):

```yaml
name: Sync Core Contract

on:
  repository_dispatch:
    types: [specrails-core-released]

jobs:
  check-compat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install specrails-core
        run: |
          npm install -g specrails-core@${{ github.event.client_payload.core_version }}
      - name: Run compat check
        run: npx tsx scripts/check-core-compat.ts
      - name: Open issue on drift
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'core-sync-required: specrails-core ${{ github.event.client_payload.core_version }} has breaking changes',
              body: 'The sync-core-contract workflow detected drift between specrails-core and specrails-hub. Run `npx tsx scripts/check-core-compat.ts` locally for details.',
              labels: ['core-sync-required']
            })
```

### Pillar 3: Runtime Contract Validation (specrails-hub)

After `SetupManager` completes the `npx specrails-core init --yes` invocation, it reads and validates the contract:

```typescript
// server/setup-manager.ts (new function)
async function validateCoreContract(projectPath: string): Promise<void> {
  const contractPath = await findCoreContract(); // resolves from npm global
  if (!contractPath) {
    console.warn('[Hub] ⚠️  Could not find integration-contract.json from specrails-core');
    return;
  }
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf-8'));

  const missingCheckpoints = contract.checkpoints.filter(
    (c: string) => !CHECKPOINTS.some(cp => cp.key === c)
  );
  const extraCheckpoints = CHECKPOINTS
    .filter(cp => !contract.checkpoints.includes(cp.key))
    .map(cp => cp.key);

  if (missingCheckpoints.length > 0 || extraCheckpoints.length > 0) {
    console.warn('[Hub] ⚠️  specrails-core contract mismatch:');
    if (missingCheckpoints.length > 0)
      console.warn(`  Checkpoints in Core but not in Hub: ${missingCheckpoints.join(', ')}`);
    if (extraCheckpoints.length > 0)
      console.warn(`  Checkpoints in Hub but not in Core: ${extraCheckpoints.join(', ')}`);
  }
}
```

Also expose the compatibility status via HTTP:

```
GET /api/hub/core-compat
```

Response:
```json
{
  "compatible": true,
  "coreVersion": "0.7.1",
  "hubVersion": "1.3.0",
  "missingCheckpoints": [],
  "extraCheckpoints": [],
  "missingCommands": [],
  "extraCommands": []
}
```

---

## Implementation Tasks

| Task | Repo | Owner | Priority |
|---|---|---|---|
| Create `integration-contract.json` + add to `files` in package.json | specrails-core | Founding Engineer | High |
| Write OpenSpec spec `openspec/specs/integration-contract.md` | specrails-core | Founding Engineer | Medium |
| Update `release.yml` with `repository_dispatch` step | specrails-core | Founding Engineer | High |
| Create `scripts/check-core-compat.ts` | specrails-hub | Hub Engineer | High |
| Create `sync-core-contract.yml` workflow | specrails-hub | Hub Engineer | High |
| Add runtime validation to `setup-manager.ts` | specrails-hub | Hub Engineer | High |
| Add `GET /api/hub/core-compat` endpoint | specrails-hub | Hub Engineer | Medium |
| Setup `HUB_DISPATCH_TOKEN` secret in specrails-core repo | DevOps | DevOps Engineer | Blocker |

---

## Alternatives Considered

### A. Declare specrails-core as devDependency in Hub
**Rejected:** Would couple release cycles. Hub would need to update its lockfile on every Core release — the opposite of our current loose-coupling design.

### B. Shared TypeScript types package
**Rejected:** Over-engineered for 2 constants. The contract file achieves the same result without adding a new package to maintain.

### C. Manual checklist in PR template
**Rejected:** Relies on human discipline. Silently breaks when forgotten.

### D. Monorepo
**Rejected:** The repos have different release cadences, audiences, and distribution channels (global npm CLI vs. web dashboard). Keeping them separate is intentional.

---

## Decision

Implement the contract-driven approach described above. It:
- Adds no runtime dependencies
- Keeps repos loosely coupled
- Creates an automated signal when drift occurs
- Validates at both CI time and runtime

---

## References

- [RFC-002: SpecRails-Tech API v1](/docs/engineering/rfcs/RFC-002-specrails-tech-api-v1.md) — related Hub integration contract
- [SPEA-82](/SPEA/issues/SPEA-82) — parent issue
- `server/setup-manager.ts` — Hub's setup orchestration
- `cli/specrails-hub.ts` — Hub CLI with KNOWN_VERBS
