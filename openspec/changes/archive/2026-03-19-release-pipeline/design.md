## Context

specrails-hub is a three-layer monorepo (server/client/cli). In dev mode the client runs on Vite's dev server (port 4201) which proxies API calls to the Express server (4200). In production/npm-installed mode there is no Vite — the server must serve the built client assets itself. Currently the server has no static file serving, the CLI cannot locate the compiled server binary (path mismatch), and no CI/CD or npm publish pipeline exists.

Current output paths:
- Server TypeScript: compiles to `dist/server/` (root-level)
- CLI TypeScript: compiles to `cli/dist/`
- Client Vite build: outputs to `client/dist/`

The CLI's `hubServerPath()` resolves the server at `<root>/server/index.js` — which never exists because the compiler writes to `dist/server/index.js`. This bug has been masked by dev mode always using `tsx`.

## Goals / Non-Goals

**Goals:**
- Rename CLI binary `srm` → `specrails-hub` everywhere
- Fix compiled server path so CLI can spawn it in production
- Server serves React dashboard + handles SPA routing in production
- npm-publishable package with minimal, correct `files` manifest
- CI runs tests and typecheck on every push and PR
- Automated release PR via release-please; npm publish on merge

**Non-Goals:**
- Windows support (out of scope for this change)
- Docker or container packaging
- Monorepo split (server/client/cli remain in one package)
- specrails-core repo changes

## Decisions

### D1: Server output path → `server/dist/` (not `dist/server/`)

**Decision:** Change `tsconfig.json` outDir from `dist/server` to `server/dist`.

**Why:** Aligns with CLI convention (`cli/dist/`), makes `files` manifest symmetric (`server/dist`, `client/dist`, `cli/dist`), and fixes the existing path resolution bug in `hubServerPath()` with a minimal change.

**Alternative considered:** Keep `dist/server/` and fix `hubServerPath()` to point there. Rejected because `dist/` at root is an implicit artifact directory — having `dist/server/` but `cli/dist/` is inconsistent and confusing.

### D2: Static serving — same port, production-only guard

**Decision:** Add an `express.static` block in `server/index.ts` that activates when the compiled `client/dist` directory exists next to the server. In dev mode (running with `tsx`), Vite handles the client — no guard needed because `client/dist` won't exist in a fresh dev checkout unless explicitly built.

**Path resolution:** From `server/dist/index.js`, client assets are at `path.resolve(__dirname, '../../client/dist')`.

**SPA fallback:** After all API routes, add a catch-all that serves `index.html` for any non-`/api` GET request, enabling client-side routing.

**Alternative considered:** Separate static server process or nginx. Rejected — unnecessary complexity for a local tool.

### D3: release-please for version management

**Decision:** Use `google-github-actions/release-please-action@v4` with `release-type: node`. It reads conventional commits (`feat:`, `fix:`, `chore:`) to determine semver bump, maintains CHANGELOG.md, creates a Release PR, and emits `release_created` output to trigger npm publish.

**Why:** Zero additional tooling, works with the commit style already in use, well-maintained.

**Alternative considered:** DIY bash + `gh` CLI. More transparent but more maintenance. Not needed here.

### D4: npm publish triggered by `release_created` output

**Decision:** In the same `release.yml` job, add a conditional step after release-please:
```yaml
- if: ${{ steps.release.outputs.release_created }}
  run: npm ci && cd client && npm ci && cd .. && npm run build && npm publish
```
Build runs inline before publish to produce the dist artifacts that go into the package.

**Why:** Single workflow file, no separate event trigger needed, build is always fresh.

### D5: `files` manifest — explicit dist-only

```json
"files": ["cli/dist", "server/dist", "client/dist"]
```
Nothing else. Source files, tests, and config are excluded. `package.json`, `README.md`, and `LICENSE` are included by npm automatically.

## Risks / Trade-offs

- **`client/dist` in dev checkout** → if a developer runs `npm run build` locally then switches to dev mode, the server will serve stale built assets instead of the Vite dev server. Mitigation: document that `npm run dev` should be used from a clean state; the proxy setup means Vite intercepts before Express in dev anyway (they're on different ports).

- **release-please PR accumulation** → commits to main accumulate in the Release PR until someone merges it. There's no auto-merge by default. Mitigation: enable branch auto-merge on GitHub + `enable-pull-request-title-update: true` so the PR stays current.

- **NPM_TOKEN expiry** → if the token expires, publish silently fails on next release. Mitigation: document token rotation; GitHub will show the workflow as failed.

- **Breaking rename `srm` → `specrails-hub`** → existing users with `srm` in scripts or aliases will break. Mitigation: noted as BREAKING in proposal; semver major bump is appropriate if already published (currently 0.1.0 so minor is fine per semver convention for pre-1.0).

## Migration Plan

1. Merge this change to main
2. release-please creates Release PR bumping to `0.2.0`
3. Add `NPM_TOKEN` secret to GitHub repo (one-time manual step)
4. Enable auto-merge on repo (Settings → General → Allow auto-merge)
5. Set branch protection on `main`: require `test` status check
6. Merge Release PR → npm publish runs automatically

For existing users of `srm`: update any local aliases or scripts to use `specrails-hub`.

## Open Questions

- None — all decisions made during explore session.
