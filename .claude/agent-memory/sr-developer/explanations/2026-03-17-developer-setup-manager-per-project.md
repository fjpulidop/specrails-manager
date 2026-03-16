---
agent: developer
feature: add-project-wizard
tags: [architecture, setup-manager, project-registry]
date: 2026-03-17
---

## Decision

`SetupManager` is instantiated once per project inside `ProjectRegistry._loadProjectContext`, alongside `QueueManager` and `ChatManager`.

## Why This Approach

This matches the existing pattern for `QueueManager` and `ChatManager`. Each project has its own process lifecycle, its own broadcast function (pre-bound with `projectId`), and its own WS message routing. Creating one `SetupManager` per project means checkpoint state, active processes, and timers are isolated — a concurrent setup in project A cannot interfere with project B.

## See Also

`server/project-registry.ts` `_loadProjectContext` method.
