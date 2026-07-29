---
name: Stage 5 Painter eval path law
description: Correct path patterns for evals that read packages/engine src from artifacts/mydungeon-quest/evals/
---

## The Rule

Evals live at `artifacts/mydungeon-quest/evals/*.mjs`.
`ROOT` is computed as `path.dirname(path.dirname(fileURLToPath(import.meta.url)))` = `artifacts/mydungeon-quest`.

| Usage | Pattern | Why |
|---|---|---|
| `readFileSync` via `path.resolve(ROOT, ...)` | `../../packages/engine/src/...` | ROOT is 2 hops from workspace root |
| Dynamic `import('...')` | `../../../packages/engine/src/...` | Relative to evals/ file location (3 hops) |

**Why:** `path.resolve(ROOT, relPath)` resolves relative to ROOT (`artifacts/mydungeon-quest`). Two `../` hops reach the workspace root, then `packages/engine/src/...` is correct. Dynamic `import()` paths are relative to the importing *file* (`evals/`), which is one directory deeper — so three `../` hops are needed.

**How to apply:** Every eval that reads engine source with readFileSync must use `../../packages/engine/...` in the path.resolve call. Every dynamic `import()` of engine modules must use `../../../packages/engine/...`. Wrong hops silently resolve to `/home/runner/packages/...` (ENOENT).
