## 1. Rename srm → specrails-hub

- [x] 1.1 Rename `cli/srm.ts` to `cli/specrails-hub.ts`
- [x] 1.2 Update `package.json` bin: rename key `srm` → `specrails-hub`, update path to `./cli/dist/specrails-hub.js`
- [x] 1.3 Update all internal references inside `cli/specrails-hub.ts` (function names `srmPrefix`, `srmLog`, `srmError`, `srmWarn`, log labels `[srm]`, help text, usage examples)
- [x] 1.4 Fix error message in `server/index.ts` line 517: replace `srm hub stop` with `specrails-hub hub stop`
- [x] 1.5 Update `client/src/components/WelcomeScreen.tsx`: replace `srm` command reference with `specrails-hub`
- [x] 1.6 Update `README.md`: replace all `srm` command references with `specrails-hub`

## 2. Fix TypeScript output paths

- [x] 2.1 Change `tsconfig.json` `outDir` from `"dist/server"` to `"server/dist"`
- [x] 2.2 Add `"build:server"` script to `package.json`: `"tsc --project tsconfig.json"`
- [x] 2.3 Update `"build"` script to include server compilation: `"npm run build:server && cd client && npm run build && cd .. && npm run build:cli"`
- [x] 2.4 Fix `hubServerPath()` in `cli/specrails-hub.ts`: update compiled path from `server/index.js` to `server/dist/index.js`, update dev fallback path accordingly

## 3. Server serves client in production

- [x] 3.1 In `server/index.ts`, after all API routes, add `express.static` middleware pointing to `path.resolve(__dirname, '../../client/dist')`
- [x] 3.2 Add SPA catch-all route after the static middleware: serve `client/dist/index.html` for any GET request not matching `/api` or `/hooks`

## 4. Package.json publish setup

- [x] 4.1 Remove `"private": true` from `package.json`
- [x] 4.2 Add `"files"` field: `["cli/dist", "server/dist", "client/dist"]`

## 5. CI/CD GitHub Actions

- [x] 5.1 Create `.github/workflows/ci.yml`: runs `npm ci`, `cd client && npm ci`, `npm run typecheck`, `npm test` on push and PR to `main`
- [x] 5.2 Create `.github/workflows/release.yml`: runs release-please on push to `main`; on `release_created` output, builds all packages and runs `npm publish` with `NPM_TOKEN`
