---
name: specrails-hub spawn patterns
description: Known-safe spawn patterns for claude CLI in specrails-hub — prevents false positives on command injection checks
type: project
---

In specrails-hub, `claude` CLI processes are spawned in several server modules:

- `server/queue-manager.ts` — spawns `claude` with pre-validated, static command args
- `server/chat-manager.ts` — spawns `claude` with session args (no user-controlled raw strings)
- `server/setup-manager.ts` — spawns `npx specrails init --yes` and `claude` for setup phase; project path is `cwd`, not an argument
- `server/proposal-manager.ts` — spawns `claude` with controlled args
- `cli/srm.ts` — spawns `claude` directly as a CLI passthrough; user input is passed as CLI args to a trusted local binary, not to a shell interpreter

The pattern `spawn('claude', args, { cwd: projectPath })` is the standard throughout; `projectPath` is taken from the validated project registry (existsSync check on registration), not directly from HTTP request bodies.

**Client-side:** `CommandGrid.tsx` sends `{ command: '/sr:' + cmd.slug }` to the server's `/spawn` endpoint. The slug comes from a pre-filtered, server-provided list of commands (not from user text input), so injection risk is low for this path. Still, server-side validation of the `command` field before it reaches the spawn call is the load-bearing control.

**Why:** These patterns recur in every security scan and are not false positives in isolation — the safety depends on the server-side validation of the command field before spawn, not on the client alone.

**How to apply:** When reviewing spawn calls in these files, verify the command value traces back to a validated/whitelisted source (e.g., `cmd.slug` from server config, not raw user text). Flag only if user-supplied text is concatenated directly into spawn args without sanitization.
