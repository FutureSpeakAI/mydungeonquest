---
name: Metro vs sibling Vite crawl race
description: In the pnpm monorepo, Expo's Metro file-map crawl dies if a sibling artifact's Vite dev server re-optimizes its deps cache at the same moment.
---

**The rule:** Never boot (or restart) the Expo workflow while a sibling Vite artifact is mid `Re-optimizing dependencies` — and expect exactly that re-optimize right after any lockfile change (e.g. `pnpm add` anywhere in the workspace).

**Why:** Metro's file-map crawler walks the entire workspace root (pnpm monorepo → watchFolders include everything). Vite's re-optimize deletes and recreates `node_modules/.vite/deps` in a sibling artifact; if that happens mid-walk, Metro's FallbackWatcher tries to watch the vanished dir and crashes the whole expo process with `Error: ENOENT ... watch '.../node_modules/.vite/deps'` (exit status 7).

**How to apply:** After a dependency install, restart the *web* workflow first (or just wait for its "ready" line), then restart the expo workflow. If expo fails with the ENOENT-watch signature, it is this race — a plain restart after Vite settles fixes it; no config surgery needed.
