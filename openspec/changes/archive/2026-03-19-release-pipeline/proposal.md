## Why

specrails-hub has no release process, no CI, and the package is marked `private: true` — it can't be published to npm. The CLI binary is also named `srm` (a legacy name) and the server has never been run in compiled form. All of this needs to land together before the project can be distributed.

## What Changes

- **BREAKING** Rename CLI command `srm` → `specrails-hub` (file, bin entry, all user-facing references)
- Fix server TypeScript output path (`dist/server` → `server/dist`) so CLI can locate and spawn the compiled server
- Add `express.static` to server so it serves the built React dashboard in production (currently only works via Vite dev proxy)
- Add SPA fallback route (`index.html`) for client-side routing
- Remove `"private": true` from `package.json`
- Add `"files"` field with minimum necessary contents: `cli/dist`, `server/dist`, `client/dist`
- Add `build:server` script; update `build` script to include server compilation
- Add GitHub Actions CI workflow (typecheck + tests on push/PR)
- Add GitHub Actions release workflow (release-please + auto-merge + npm publish)

## Capabilities

### New Capabilities

- `ci-cd`: GitHub Actions workflows for CI (tests/typecheck) and automated releases via release-please with npm publish on merge
- `production-static-serving`: Server serves built React client assets in production mode with SPA fallback

### Modified Capabilities

- `cli-entrypoint`: CLI binary renamed from `srm` to `specrails-hub`; server path resolution fixed for compiled output

## Impact

- `cli/srm.ts` → `cli/specrails-hub.ts` (rename + fix hubServerPath)
- `tsconfig.json` outDir change affects where `tsc` writes server output
- `package.json`: remove private, add files, rename bin, add build:server script
- `server/index.ts`: add static serving block + fix error message
- `client/WelcomeScreen.tsx`: update command reference
- `README.md`: update all `srm` references
- New: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Requires: `NPM_TOKEN` secret + branch protection in GitHub (documented, not automated)
