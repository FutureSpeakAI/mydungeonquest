# CHANGELOG — The Workspace Chronicle

Newest first; releases carry names. The game keeps its own finer-grained log at [`artifacts/mydungeon-quest/CHANGELOG.md`](artifacts/mydungeon-quest/CHANGELOG.md), and every cut's full intent is preserved in [`docs/directives/`](docs/directives/).

## [Unreleased] — 0.6.0-dev · the Saga Cut groundwork

### The ascension (Phase 0)
- FateScript extracted to `packages/engine` and consumed as the `fatescript` workspace package (zero dependencies, MIT, `1.2.0-dev`). All 58 game gates green through the move.

### The groundwork laws (modules + gates; app wiring charted phase by phase)
- New engine modules in the house voice: `saga`, `hearth`, `memoir` (annals), `ravens`, `sky`, `direction`, `shareCard`.
- Seven new engine gates — `saga`, `hearth`, `longMemory`, `ravens`, `sharedSky`, `direction`, `shareCard` — the suite grows **58 → 65**, keyless as ever.
- Root scripts: `pnpm run check` now runs engine gates then the game suite (`check:engine`, `check:game`).

### The proving ground goes public
- GitHub Actions workflow **The Proving Ground**: frozen install, engine gates, full game check on every push and PR — with no secrets, on purpose.

### The library
- New at the root: `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`, this chronicle.
- New in `docs/`: `CLAWS.md` (the unified law table), `HOUSE.md` (the operator's manual), `GLOSSARY.md`, `ROADMAP.md`.
- Directives consolidated in `docs/directives/` — I through V, including the Saga Cut — with earlier handoffs kept in `docs/archive/`.
- The engine gains its own `README.md` and MIT `LICENSE`.

### Amendments (see the log in `docs/CLAWS.md`)
- **The sermon retires; the plumbing stays.** Player-facing *proves* becomes *keeps* across the docs; `seal.js` untouched; no gate weakened. The stale "no server-side saves" claim retired — the vault has been real for a while, and the Hearth is charted.

## Earlier

The road already walked — First Light through the Living World — is chronicled where it happened: the game's changelog and the directives, each preserved as written.
