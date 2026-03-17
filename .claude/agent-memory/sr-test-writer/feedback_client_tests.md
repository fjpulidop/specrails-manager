---
name: client_tests_no_infrastructure
description: Client React components cannot be tested with the root vitest config — no @testing-library/react, no jsdom, and vitest.config.ts only covers server/ and cli/
type: feedback
---

The root `vitest.config.ts` includes only `server/**/*.test.ts` and `cli/**/*.test.ts`.

**Why:** The client is a separate Vite app (in `client/`) with its own `package.json`. It does not have `@testing-library/react`, `jsdom`, `happy-dom`, or `vitest` installed. The root `node_modules` has `vite`, `vitest`, and `esbuild` but no React transform (`@vitejs/plugin-react` is in `client/node_modules` only).

**How to apply:** When asked to write tests for files in `client/src/`, write pure-logic tests extracted into `server/<module>-logic.test.ts` for business logic that can run in Node. Also write the full `client/src/components/<Component>.test.tsx` as documented/future tests with a clear note at the top about what infrastructure is needed. Do NOT attempt to run the `.tsx` test file with the root vitest — it will always exit with "No test files found".

The pure-logic test approach:
- Re-declare the module-level constants from the component verbatim in the test file
- Test all ordering, filtering, and mapping logic without React/DOM
- Place the file in `server/` so it's picked up by the existing vitest config
