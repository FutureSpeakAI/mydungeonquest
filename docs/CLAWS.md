# CLAWS — The Laws of the House

A law here is not a comment. A law is three things landed together: a **statement** in this table, an **enforcement point** in named code, and a **gate** in the proving ground that fails loudly when the law bends. Any document a law touches is synchronized in the same change that lands the law.

Run the whole court, keyless, from the root:

```bash
pnpm run check   # engine gates, then the game suite — 65 and counting
```

---

## The standing laws

| Law | What it holds | Enforced | Held by |
|---|---|---|---|
| **The Three cLaws** | A DM turn may not injure the game state; must obey the contract; may defend itself only within the first two. One repair turn, then the understudy, then the inert fallback — the law is never loosened to keep a turn alive. | `fatescript/protocol` → `validateDmTurn`; `server/dm.js` repair loop | `evals/run.mjs` bench |
| **The One Door** | The model's only output channel is a single forced `dm_turn` tool call; the payload is hostile until proven lawful. The schema, the prompt, and the validator move in lockstep or not at all. | `server/dm.js`, `src/lib/systemPrompt.js`, `fatescript/protocol` | `doorkeeper`, `run.mjs` |
| **The Quiet Record** | The journal is append-only, hash-linked, and device-signed; it **keeps** the story straight — across exports, imports, devices, and years. A forged chronicle turns the audit red. Sealed history is never rewritten. | `src/lib/seal.js`, `public/verify.html`, server vault chain checks | `run.mjs` seal invariants, `vault` |
| **The Cast Law** | A voice is cast once from the card and kept for the tale's life; migrations recast nobody; legacy pools are locked. **The dead do not speak** — dying words in the killing turn are honored, and afterward the validator holds the line. | `fatescript/cards`, casting, cast snapshot in `validateDmTurn` | `castLaw` |
| **The Sound Law** | One live sound. Voice preempts instantly; music is punctuation, never wallpaper; late accents are dropped, never played; the audio floor is silence, and mock provenance is refused at the door. | `src/lib/cinema/audioDirector.js` — the single throat | `audioDirector`, `narratorConcurrency` |
| **The Chronicler's Three Laws** | It may not invent; it may not contradict; it may only retell. Passages cite sealed turn ranges, names resolve in the codex, dice match sealed totals, quotes are verbatim and declared, and no mock prose is ever sealed. | `fatescript/chronicler` — one validator in every court | `chronicler` |
| **The Verbatim Court** | Anywhere the record speaks in public — storybook, podcast, wiki — quoted words are byte-for-byte from sealed turns or absent. Edge punctuation is typography; wording is law. | `fatescript/chronicler`, forge segment checks | `podcastForge`, `storybook`, `wiki` |
| **Binder's Door** | Only attested media binds. Every plate is a `data:` URI with provenance; retired film-era media renders as still plates; nothing with mock or missing provenance reaches a keepsake or a speaker. | Foundry attestation, storybook binding, Audio Director | `storybook`, `mediaFallback` |
| **The Redaction Law** | The X-card bends the visible story, never the audit trail: redactions append, redacted turns never reach the Chronicler, the book, or the Forge — not their words, not their deaths. | seal events, chronicler intake, storybook binding | `chronicler`, `storybook` |
| **The Living World** | Offscreen movement is deterministic, ops-only, budgeted, and sealed as ticks — active, goal-bearing souls act between turns; villains scheme by other means. No tokens are spent to keep the world alive. | `fatescript/livingWorld` | `livingWorld` |
| **The Graph Law** | Memory is derived from the record alone. The context pack is assembled under budget from sealed material; the scene floor is never trimmed. | `fatescript/graph` | `graph` |
| **The Hero's Anchor** | The hero's face is anchored and every later portrait answers to it. | Foundry anchor conditioning | `heroAnchor` |
| **The Sealing** | The epilogue must *play* before a tale completes; Seal the Tale records exactly once; a sealed tale advances no further; the closing cards can neither double-fire nor be skipped by a race. | endings flow, cinematic close latch | `endings`, `cinematicClose` |
| **The Toll Law** | The taste pours exactly six turns. Refusals arrive as receipts at the window, never as silent failures. A keyless fork never learns money exists. | toll-house middleware | `tollhouse` |
| **The Watchtower** | Every lane has a ceiling — images 80, music 8 a session — and the watch counts before the provider is ever called. | `watchtower` middleware, media caps | `watchtower` |
| **The Floor** | Keyless is not a degraded mode; it is the proving ground. Every lane ends in a deterministic mock, the whole suite runs with zero keys, and the game degrades — it never blocks. | adapter chains, `MOCK_SEED` | the entire suite, run keyless in CI |

## The Saga laws (Directive V)

Nine laws for the long road, stated in full in [`directives/EXPERIENCE-DIRECTIVE-V.md`](directives/EXPERIENCE-DIRECTIVE-V.md). **Groundwork** means the module and its gate stand in the engine today; the app wiring is its own phase, one checkpoint at a time.

| Law | One line | Module | Gate | Status |
|---|---|---|---|---|
| **I. Hearth Law** | The record's home is the house; a device is a chair by the hearth, and a losing fork returns as an unsent deed — never a lost one. | `fatescript/hearth` | `hearth` | Groundwork |
| **II. Saga Law** | A world outlives its tales: sealing a volume writes a legacy packet; the next tale opens inside the same world, and the dead of volume one do not speak in volume three. | `fatescript/saga` | `saga` | Groundwork |
| **III. Long Memory Law** | Year two remembers year one — annals (the memoir, as the code named it) are composed from the record, judged for invention, and laddered into the pack. | `fatescript/memoir` | `longMemory` | Groundwork |
| **IV. Raven Law** | The world moves in your absence and accounts for itself on return; every recap sentence traces to a sealed op. | `fatescript/ravens` | `ravens` | Groundwork |
| **V. Shared Sky Law** | One sky over every world: a seasonal omen enters as a hook, never a command, and the covenant remains supreme. | `fatescript/sky` | `sharedSky` | Groundwork |
| **VI. Likeness Law** | Faces are blessed at the Sitting, warded on every render, and allowed to age — never to reset. | Foundry (charted) | `sitting`, `warden` | Charted |
| **VII. Choir Law** | Major souls receive minted voices; every spoken line carries a direction tag derived from the record. The deterministic direction floor stands today. | `fatescript/direction` (floor) | `direction` (floor); `choir` charted | Floor standing |
| **VIII. Commons Law** | Sealed chapters may walk the public shelf — secrets struck, quotes verbatim, forks credited, and the shelf shows text as text. The share-card composer stands today. | `fatescript/shareCard` (floor) | `shareCard` (floor); `commons` charted | Floor standing |
| **IX. Long Toll Law** | A tier for patrons of years; one table drives every ceiling; the watch keeps its ledger through the night. | toll-house (charted) | `longToll` | Charted |

## The amendment log

Amendments are stated plainly, landed in lockstep, and never weaken a gate.

1. **The dead do not speak.** Schema note, prompt clause, validator check — all landed together, cast snapshot threaded through client and repair loops alike.
2. **The film retires** *(July 2026)*. The video pipeline yields to painted stills; film-era chronicles keep their keyframes as ordinary illustrations, because sealed history is never rewritten.
3. **The engine ascends** *(Saga Cut, Phase 0)*. FateScript extracted to `packages/engine`, consumed as the `fatescript` workspace package — all 58 game gates green through the move.
4. **The sermon retires; the plumbing stays** *(Saga Cut)*. The house stops preaching cryptography to players: every touched document that said the record *proves* now says the record *keeps*. `seal.js` is unchanged, the chain gates are unweakened — the hash chain is how the hearth syncs without duplication and how replay stays byte-true.

---

*The meta-law over all of it: **PASS only grows.** Evals are append-only; fixing a failure by loosening a gate is the one forbidden move. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md).*
