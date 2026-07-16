# ARCHITECTURE — The Shape of the House

The model narrates. The client rules. Everything below is that inversion, drawn at room scale; the turn-by-turn detail lives in the [README](README.md), and the laws that hold it all are tabled in [`docs/CLAWS.md`](docs/CLAWS.md).

## The shape

```
packages/engine/                 fatescript — the law layer
  src/protocol.js                  validateDmTurn, makeEntropy — the final word
  src/rules.js, story.js           dice, reducers, canon
  src/cards.js, graph.js           souls, memory-from-record
  src/livingWorld.js               deterministic offscreen movement
  src/chronicler.js                the retelling court
  src/saga|hearth|memoir|ravens|sky|direction|shareCard.js
                                   the Saga groundwork (Directive V)
  evals/                           the engine's own gates (7)

artifacts/mydungeon-quest/       the game — one self-contained artifact
  src/App.jsx                      the hub: wiring, never law
  src/lib/seal.js                  the Quiet Record (journal, signatures)
  src/lib/systemPrompt.js          the DM's contract
  src/lib/db.js                    Dexie / IndexedDB — the local shelf
  src/lib/vault.js                 the house vault sync (signed-in)
  src/lib/cinema/                  the Foundry: paint & audio lanes,
                                   Audio Director, narrator, procedural floor
  server/                          Express 5 — the relay, adapters, toll & watch
  evals/                           the game's proving ground (58 gates)
```

The game imports the engine as a workspace package — `import { validateDmTurn } from 'fatescript/protocol'` — and **never reimplements it**. The engine has zero dependencies, carries its own MIT license, and knows nothing of React, Express, Dexie, money, or keys. Anything that touches a provider, a database, a browser, or a wallet lives in the game.

## One turn, end to end

1. The client assembles the pack — `[STATE] [STORY] [MEMORY] [ENTROPY] [RESOLUTION?] [PLAYER]` — from the codex and the sealed record, under budget, scene floor never trimmed (`fatescript/graph`).
2. The relay (`server/dm.js`) forces exactly one `dm_turn` tool call. Narration streams; mechanics wait for the full validated payload.
3. `validateDmTurn` judges the payload against every enum, budget, and the pre-turn cast snapshot. Fail → one repair turn with the exact violations; fail again → the understudy under the same law; fail again → the inert `safeFallbackTurn`. The game never advances on an invalid turn.
4. Reducers apply the deltas; the journal seals the turn — append-only, hash-linked, signed; the Foundry is briefed under stable cache keys while the next beat is still playing.
5. Renderers answer to their own laws: plates through Binder's Door, every sound through the Audio Director's single throat, retellings through the Chronicler's court.

## Persistence, today and tomorrow

**Today:** the record lives on the device (Dexie/IndexedDB) and plays fully offline; signed in, sealed envelopes also sync to the house vault, where the chain law is re-verified server-side and tampering is refused (`vault.test.mjs`). **Tomorrow (Directive V, Hearth Law):** the vault becomes the record's home and devices become chairs — any signed-in device pulls the head and resumes mid-sentence; a stale-head append is refused and its deed returns as unsent. The groundwork client (`fatescript/hearth`) and its gate stand now; the wiring is its own phase.

## The two proving grounds

Sixty-five gates, all keyless, all green before anything ships: the engine's fifteen engine gates (`pnpm run check:engine`) and the game's fifty-eight (`pnpm run check:game` — build plus the full suite, React exercised headless via an esbuild JSX loader and `fake-indexeddb`). CI runs both on every push with no secrets on purpose — see [`.github/workflows/check.yml`](.github/workflows/check.yml).

## The second proof

Every cut ships its directive, unedited, in [`docs/directives/`](docs/directives/) — the spec that built the thing rides with the thing. And the record itself is the first proof: export a `.chronicle.json` and the offline verifier replays every hash, link, and signature; the same replay, byte-identical, is what the gates assert.
