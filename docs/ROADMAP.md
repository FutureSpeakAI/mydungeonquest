# ROADMAP — The Road as It Stands

The plan of record is [`directives/EXPERIENCE-DIRECTIVE-V.md`](directives/EXPERIENCE-DIRECTIVE-V.md) — the Saga Cut. This page is the honest odometer: what is done, what stands gated, what is charted. Convention throughout: **one phase per checkpoint**, and a law counts as *standing* only when its module and gate are green.

## Done — Phase 0, the ascension

FateScript extracted to `packages/engine` and consumed as the `fatescript` workspace package. All **58 game gates green through the move**; the engine carries zero dependencies and its own MIT license. The two-repo copy-and-patch era is over inside this tree — the game imports the law, it no longer mirrors it.

## Standing now — the Saga groundwork (7 new gates; the suite is at 65)

Each module ships with its gate in `packages/engine/evals/`. **Gated but not yet wired into the app** — that is by design; wiring is where bugs breed, so each hook lands as its own phase.

| Module | Law | Gate | What it already holds |
|---|---|---|---|
| `fatescript/saga` | Saga | `saga` | Legacy packets (6 facts, exact voiceIds), next-tale opening, deterministic interludes, span lines. |
| `fatescript/hearth` | Hearth | `hearth` | Two-chair convergence against a mock vault; stale heads refused; losing deeds returned unsent; broken chains refused. |
| `fatescript/memoir` | Long Memory | `longMemory` | Annals composed from the record, judged in the court — invented proper nouns and bent quotes refused. |
| `fatescript/ravens` | Raven | `ravens` | Absence batches capped at six, deterministic; recaps traced op-by-op; zero absence, zero noise. |
| `fatescript/sky` | Shared Sky | `sharedSky` | Season selection, bounded ≤200-char notes, the off-switch honored. |
| `fatescript/direction` | Choir (floor) | `direction` | Deterministic per-line direction from record state — the dead say nothing, crits ring bright, blight hushes the room. |
| `fatescript/shareCard` | Commons (floor) | `shareCard` | Turning-point picks, verbatim quotes, secrets struck, hostile names inert, fork genesis credited. |

## Standing now — the World Cut groundwork (Directive VI: the suite is at 74)

Eight engine laws with green gates — clock, ledger, market, atlas,
bearing, sitting, scriptorium, tells — plus **the Salon**
(`tools/salon/`: the Tell Me A Story human shelf, opened with zero
dependencies, untracked by law) and **the Folio** design
(`docs/design/`). Wiring is charted in
`docs/directives/EXPERIENCE-DIRECTIVE-VI.md`, one phase per checkpoint:
world ops at the protocol (lockstep), the Sitting at the forge, the
Folio, ripples & the Loom, the Scriptorium convened, the Human Hand at
the table.

## Charted — the wiring phases (Directive V, in order)

| Phase | Lands | Gate(s) |
|---|---|---|
| 1 | The Hearth wired: vault primacy, any-chair resume *(house side)* | `hearth` grows |
| 2–4 | Saga, annals, and ravens hooked into the app's open/seal flow | existing gates grow |
| 5 | The live season feed *(house)*; the sky note enters real packs | `sharedSky` grows |
| 6 | The Sitting and the Warden at the Foundry | `sitting`, `warden` |
| 7 | The Choir: minted voices, direction riding real speak calls | `choir` |
| 8 | The Commons: the public shelf, forks, reels *(house)* | `commons` |
| 9 | The Long Toll: the years-deep tier, durable watch ledger *(house)* | `longToll` |
| 10 | The Binding: saga wiki view, ravens on open, docs sweep, release | `longRoad` |

**The trees meet at sixty-eight.** Release targets: fatescript **1.2.0 — "The Long Road"**; MyDungeon.Quest **0.6.0 — Saga Cut**.

## The road beyond

Charted, not begun: **The Table** (guests watching live, whispering suggestions), **The Audiobook** (the sealed record read verbatim in the tale's own voices), **The Living Atlas** (region plates stitched into a map that fills in as it is walked).
