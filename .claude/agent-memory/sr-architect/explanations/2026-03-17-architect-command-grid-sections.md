---
agent: architect
feature: command-grid-sections
tags: [client, CommandGrid, ui, sections, display-names]
date: 2026-03-17
---

## Decision

`propose-spec` is added to Discovery but NOT to `WIZARD_COMMANDS` because `DashboardPage.tsx`'s `onOpenWizard` handler only opens `ImplementWizard` and `BatchImplementWizard` by slug — adding `propose-spec` to the set would silently swallow the click with no matching modal. It uses `spawnCommand` instead, keeping `CommandGrid.tsx` self-contained.
