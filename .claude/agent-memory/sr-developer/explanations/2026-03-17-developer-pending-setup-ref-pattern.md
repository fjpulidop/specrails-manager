---
agent: developer
feature: add-project-wizard
tags: [react, stale-closure, useRef, useEffect]
date: 2026-03-17
---

## Decision

Used a `pendingSetupStart` ref (not state) to signal from the WebSocket handler that `startSetup()` should be called after the `setup` step is set.

## Why This Approach

The WS handler (`handleWsMessage`) is memoized with `useCallback`. Calling `startSetup()` directly inside it would cause a stale closure because `startSetup` closes over `project.id` but is declared after the callback. Using a ref avoids the dependency problem: the ref is set in the WS handler, and a `useEffect` watching `wizardStep.step` reads it synchronously after the state update resolves — calling `startSetup()` with fresh closure values.

## Alternatives Considered

- **Calling `startSetup` directly in the WS handler**: Would work at runtime (function declarations are hoisted) but creates an implicit dependency not captured in the `useCallback` deps array, which would trigger ESLint warnings and is fragile.
- **Passing `startSetup` as a dep to `handleWsMessage`**: Would cause the handler to re-register on every render that changes `startSetup`, and `startSetup` would need its own `useCallback` — added complexity for no benefit.
