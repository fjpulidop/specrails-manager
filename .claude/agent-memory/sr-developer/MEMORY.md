# Developer Agent Memory — specrails-manager

## Key patterns

- WebSocket messages are broadcast globally and filtered by `projectId` on the client
- `useSharedWebSocket` fans out all messages to every registered handler — always filter by projectId
- New message types added to `server/types.ts` WsMessage union propagate automatically
- `SetupManager` is instantiated per-project in `ProjectRegistry._loadProjectContext`
- Hub context (`useHub`) is the source of truth for which projects are in wizard mode

## Architecture notes

- `AddProjectDialog` → calls `startSetupWizard(projectId)` → `HubContext.setupProjectIds`
- `App.tsx` renders `SetupWizard` instead of `ProjectLayout` when `isInSetup` is true
- `SetupWizard` owns all wizard state; `SetupManager` (server) owns process lifecycle
- `setup_install_done` WS event auto-transitions install → setup phase via `pendingSetupStart` ref

## File locations

- Server setup logic: `server/setup-manager.ts`
- Setup WS types: `server/types.ts` (SetupLog/Checkpoint/Chat/Complete/Error messages)
- Setup routes: `server/project-router.ts` (POST /:projectId/setup/*)
- Wizard UI: `client/src/components/SetupWizard.tsx`
- Checkpoint UI: `client/src/components/CheckpointTracker.tsx`
- Chat UI: `client/src/components/SetupChat.tsx`
