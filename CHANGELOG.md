# CHANGELOG — The Workspace Chronicle

Newest first; releases carry names. The game keeps its own finer-grained log at [`artifacts/mydungeon-quest/CHANGELOG.md`](artifacts/mydungeon-quest/CHANGELOG.md), and every cut's full intent is preserved in [`docs/directives/`](docs/directives/).

## [Unreleased] — 0.6.0-dev · the Saga & World Cut groundwork

### The playtest triage (July 15)
- **The Census** (`census.js`, gate `census`): prose-born NPCs can no longer vanish — an attributed speaker the record does not know bounces the turn back through the one-repair door demanding its `cast_add`. Answers the codex blindness seen a dozen turns into a live table.
- **The Warden** (`warden.js`, gate `warden`): machine vision judges every post-blessing render against the blessed anchor under a deterministic ruling — pass attested, repaint once with the drift notes, then the anchor stands in. The house never ships a stranger. Answers the visual drift from the same table.
- The muster gains **THE TRIAGE**: playtest wounds print first and outrank roll order; `census`, `hero-avatar` (the face on the sheet), and `warden` join the roll. Suite **74 → 76**.

### The World Cut groundwork (Directive VI)
- Eight new engine modules in the house voice — `clock`, `ledger`, `market`, `atlas`, `bearing`, `sitting`, `scriptorium`, `tells` — with eight gates; the suite grows **65 → 74** (15 engine · 58 game · 1 salon), keyless as ever.
- **The Scriptorium** adapts DeepMind's Agents' Room (arXiv 2410.02603): specialized scribes plan in notes and directives under One Door — the room plans, the door speaks.
- **The Human Hand** answers StoryScope (arXiv 2604.03136, 93% detection from structure alone): the four measurable tell families are convicted deterministically in the sealed record and countered in the pack's own `directives` — and the durable fingerprint, machine plotting, was never ours to leave: the player, the dice, the entropy, the spine, and the ticks author the structure here.
- **The Salon** (`tools/salon/`): the Tell Me A Story human shelf, opened with zero dependencies, untracked by law — root gate `check:salon`.
- **The Folio**: the codex presentation reconsidered — vellum on ink, ribbon tabs, marginalia seals that open the sealed record; `docs/design/codex-folio.html` + spec. The Sitting is visible on the hero's leaf: three faces sat, one was blessed, and no sheet minted before the face was accepted.
- `docs/directives/EXPERIENCE-DIRECTIVE-VI.md` — **THE WORLD CUT**: eight laws standing, ten wiring phases charted, one per checkpoint.

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
