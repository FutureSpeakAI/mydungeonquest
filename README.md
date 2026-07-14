# MyDungeon.Quest

**A cinematic solo RPG that plays offline and keeps the only true copy on your device.**

One player. One AI Dungeon Master. A persistent fantasy campaign with real dice, real combat, painted illustrations, a voiced narrator — and a cryptographically sealed record of every turn. Everything lives in your browser: no accounts, no telemetry, no server-side saves.

The model narrates. The client rules. That inversion is the entire architecture, and this document explains it.

---

## Quick start

```bash
pnpm install
pnpm --filter @workspace/mydungeon-quest run dev
```

Open the printed URL and forge a world. **No API keys are required** — without keys the game runs a deterministic mock Dungeon Master and procedural art, so the whole product is playable (and testable) offline. Keys unlock the live experience; see [Providers & configuration](#providers--configuration).

In development, two processes run: Vite owns the public port and proxies `/api` to the game's Express server on an internal port. In production (`run build` + `run start`), Express serves the built app and the API together.

To verify a working tree, run the proving ground **keyless** (it asserts the mock floor on purpose):

```bash
env -u ANTHROPIC_API_KEY -u OPENAI_API_KEY -u ELEVENLABS_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY \
  pnpm --filter @workspace/mydungeon-quest run check
```

## The harness: how a turn works

MyDungeon.Quest treats the language model as a brilliant, untrusted narrator strapped into a harness. The model is never the rules authority — the client computes every player mechanic, rolls every player die, applies every state change as a validated delta, and keeps the canon. The model's only output channel is a single forced tool call, `dm_turn`, and that payload is treated as hostile until proven lawful.

```
player input
   │
   ▼
client assembles the turn payload
   [STATE] [STORY] [MEMORY] [ENTROPY] [RESOLUTION?] [PLAYER]
   + the DM's own prior narration as real conversation history
   │
   ▼
POST /api/dm  (?stream=1 for SSE — narration renders as it forms,
   │           but mechanics wait for the full validated payload)
   ▼
forced tool call: dm_turn
   (the JSON schema mirrors every enum the client will enforce)
   │
   ▼
validateDmTurn — client-owned law, stricter than any schema
   │─ pass ──────────────► reducers apply the deltas
   │                       journal seals the turn (append-only)
   │                       Foundry briefs the media lanes
   │
   └─ fail ─► one repair turn: the exact violations go back to the
              model as a tool error; it resends a corrected dm_turn
                 │
                 └─ still unlawful ─► understudy DM: an OpenAI
                    fallback bound to the same schema + validator
                       │
                       └─ still unlawful ─► safeFallbackTurn
                          (generic prose, mechanically inert — the
                           game never advances on an invalid turn)
```

Key pieces, and where they live in `artifacts/mydungeon-quest/`:

| Piece | Where | What it does |
|---|---|---|
| Rules authority & reducers | `src/lib/rules.js`, `src/lib/story.js`, `src/App.jsx` | All dice, initiative, HP, XP, canon. Model output arrives as deltas; the client may refuse them. |
| The law | `src/lib/protocol.js` → `validateDmTurn` | Client-side validator; the final word on every turn. |
| The contract | `src/lib/systemPrompt.js` | The DM's charge: a numbered MANDATORY CONTRACT plus THE CRAFT (prose discipline) — states everything a JSON schema cannot. |
| The schema | `server/dm.js` | Anthropic tool schema kept in lockstep with the validator's enums, plus the repair-retry loop and SSE streaming. |
| Entropy | `src/lib/protocol.js` → `makeEntropy` | Eight pre-rolled dice per turn for NPC/world randomness; the model must consume them in order and declare every use. No hidden rolls. |
| The Foundry | `src/lib/cinema/` | Two media lanes (paint / audio) with beat lookahead: while beat N plays, beat N+1's still and music phrase are already briefed under stable cache keys. |
| The Audio Director | `src/lib/cinema/audioDirector.js` | The single throat for every non-narration sound; enforces the Sound Law (below). |
| The seal | `src/lib/seal.js`, `public/verify.html` | Append-only, hash-linked, signed journal. Export a `.chronicle.json` and the offline verifier recomputes every hash, link, and signature. |
| Local persistence | `src/lib/db.js` (Dexie / IndexedDB) | Campaigns, journal, memory, media — the only true copy is the player's. |

A generated asset never mutates a signed turn: the turn commits a media *intent*, delivery appends an attestation. Redactions (the X-card) append events too — the visible story bends to player consent; the audit trail does not.

## Asimov's cLaws

Asimov gave robots three laws. MyDungeon.Quest gives its Dungeon Master three — **c**lient-enforced (that's the "c"), and with claws. They exist because a language model is a gifted storyteller and an unreliable bookkeeper: everything narrative is delegated to it, everything mechanical is taken away from it.

**First cLaw — a DM turn may not injure the game state, or through omission allow it to come to harm.**
The model never rolls a player's die, never edits state directly, and never resolves its own tension. When an outcome is uncertain it must stop the scene and hand the dice to the player (`roll_request`). All change arrives as deltas the client may reject, and `state_updates` must be `null` while a roll is unresolved — even a well-formed update is refused if it would jump a pending roll.

**Second cLaw — a DM turn must obey the contract, except where obedience would conflict with the First cLaw.**
Exactly one `dm_turn` tool call, all eleven fields present every time, every value inside the law:

- **Narration:** 1–8 blocks, 20–180 words total (the craft asks for 60–140), each block only `text` + `speaker`. Dialogue speaks in a registered cast voice or not at all.
- **The cast:** status is an enum — `active`, `dead`, `missing` — and **the dead do not speak**: dialogue attributed to a soul who was already dead when the turn began invalidates the whole turn. A soul may speak its dying words in the very turn that kills it; afterward the validator holds the line, and there are no resurrection retcons.
- **Suggestions:** exactly 3, distinct, ≤ 6 words each — and one should be unexpected.
- **Rolls:** kinds `check/save/attack/damage/death_save`, dice `d4…d100`, DC an honest integer 5–30 or null, advantage from the fixed enum; attacks and damage must name their `action_id`.
- **Combat:** ops `start/update/end`; zones are range bands `engaged/near/far`; enemy HP/AC inside sane bounds.
- **Cinematics:** reserved for true structural beats — seven types, a title, a subtitle, and a palette of exactly three hex colors.
- **Entropy:** world randomness comes only from the supplied dice pool, consumed contiguously, in order, each use declared with its purpose.
- **Cues:** dialogue lines ≤ 18 words; image cues are `portrait`/`scene` with named subjects — the client owns every actual media prompt.
- **Time:** `time_advance` moves the world only in whole `hours` or `days`, an integer 1–30 at a step.
- **Tone:** the campaign covenant, lines, and veils are absolute; output stays PG-13; the DM never breaks character.

**Third cLaw — a DM turn may protect its own existence, as long as that does not conflict with the first two cLaws.**
A turn that breaks the law gets one chance to save itself: the server returns the *exact* violations to the model as a failed tool result, and the model resends a corrected `dm_turn`. (Transport and API errors earn a plain retry — only lawbreaking earns the repair payload.) If the turn is still unlawful, an understudy takes the stage: an OpenAI fallback DM bound by the very same schema and validator (`DM_FALLBACK=off` sends it home). If the understudy fails too, the turn dies and `safeFallbackTurn` speaks in its place. The law is never loosened to keep a turn alive.

### Where the laws live

Each law is written in three places, deliberately redundant:

1. **The tool schema** (`server/dm.js`) teaches the model every enum and shape the client will accept — a model cannot guess `boss_reveal` or `d100` from vibes.
2. **The system prompt** (`src/lib/systemPrompt.js`) states what a schema cannot express: word budgets, entropy order, DC honesty, beat pacing, tone covenants.
3. **The validator** (`src/lib/protocol.js`) enforces all of it, client-side, after the fact — including against the codex itself: the pre-turn cast snapshot travels with every validation (`validateDmTurn(payload, entropy, { cast })`), so the dead cannot be given dialogue. It is the only layer that *matters*; the other two exist so the model rarely meets it.

**Amending a law** means changing all three in lockstep — schema, prompt, validator — then re-verifying against live turns (the model is nondeterministic; one green run proves nothing). Fixing a live failure by loosening the validator is the one forbidden move. The first amendment is live: **the dead do not speak** — schema note, prompt clause, validator check, all landed together, with the cast snapshot threaded through both the client turn path and the server repair loops.

## The Sound Law

The audio layer obeys one law, enforced by a single client-side Audio Director (`src/lib/cinema/audioDirector.js`) through which every non-narration sound must pass:

- **One voice at a time.** The narrator — and each cast member reading its own lines — owns the stage. The instant a voice starts, music is silenced: no fade, no negotiation, and nothing may start over it.
- **Music is punctuation, not wallpaper.** Short phrases (8–20 seconds, generated to end cleanly) fire only at structural moments — cinematic cards, chapter turns, the Sealing. Nothing loops. There are no beds.
- **Effects are single accents in the gaps.** A die on parchment, a drawn blade, a page turn. If the moment passes before the sound is ready, the sound is dropped — punctuation is never late.
- **The audio floor is silence.** Art degrades to procedural plates, but audio never degrades to placeholder tones: an asset with mock or missing provenance is refused at delivery, and a keyless table plays nothing at all. (`speechSynthesis` is banned outright.)

The Director enforces provenance, precedence (voice > effects > music), the one-live-sound invariant, and the drop-or-wait window for staged punctuation. `evals/audioDirector.test.mjs` and the narrator concurrency suite hold it to the law.

## The proving ground

```bash
pnpm --filter @workspace/mydungeon-quest run check   # build + full eval suite
```

The suite runs headless in Node — no browser, no keys, no network:

- `evals/run.mjs` — the bench: DM protocol validity, streaming parity, reducers, canon integrity, PG-13 scrubber, Foundry budget caps, seal/tamper invariants (a forged chronicle must turn the audit red).
- `evals/castLaw.test.mjs` — the cast law: the dead do not speak (including the dying-words exception), casting reads the card (timbre/age/villain scoring, deterministic tiebreak), the migration recasts nobody (legacy pool order is locked by hardcoded voice-id arrays), and the card canon holds (status enum, memorial facts, resurrection refusal, fact dedup caps, bond arcs).
- `evals/endings.test.mjs` — acts, chapters, endings: the epilogue beat must *play* before a tale completes (arriving is not completing), Seal the Tale records exactly once and steers a quiet combat-free denouement through the [STORY] directives, the countdown ticks even across story-null turns, and a sealed tale advances no further.
- `evals/mediaFallback.test.mjs` — the legacy-media contract: film-era logs render their painted posters as still plates (never a `<video>`), overlays ignore retired media rows, and the retired `cinema` tier is canonicalized to `illuminated` across export, import, and persistence round-trips.
- `evals/narratorConcurrency.test.mjs` — the narrator never overlaps voice tracks no matter how fast turns arrive, constructs no music bed, and refuses mock-provenance segments (a keyless reading is silence, not sine tones).
- `evals/audioDirector.test.mjs` — the Sound Law: one live sound, instant voice preemption, punctuation windows (late accents are dropped, never played), provenance refusal at the door.

React components are exercised inside the same harness via an esbuild JSX loader, `react-test-renderer`, and `fake-indexeddb`. The suite must pass **keyless** — it asserts the mock floor, which is the design mandate: the game degrades, it never blocks. After touching the cLaws or the prompt, also spot-check a handful of live turns; nondeterminism hides there.

## Providers & configuration

Every external capability sits behind an adapter chain that ends in a deterministic mock. Media lanes auto-select from whichever keys exist; the Dungeon Master is Anthropic-or-mock, with the OpenAI understudy stepping in only after a live Anthropic turn fails:

| Lane | Chain | Keys |
|---|---|---|
| Dungeon Master | Anthropic Claude (when its key is set) → OpenAI understudy after a failed turn (same schema + validator) → mock DM | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| Paint (scenes, portraits) | Gemini → OpenAI → procedural | `GEMINI_API_KEY` or `GOOGLE_API_KEY`, `OPENAI_API_KEY` |
| Voice | ElevenLabs → OpenAI → mock | `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` |
| Music / SFX | ElevenLabs → mock | `ELEVENLABS_API_KEY` |

The mock floor keeps every lane testable, but the client refuses mock **audio** at delivery — the audio floor is silence (see [The Sound Law](#the-sound-law)); only art keeps a visible procedural floor.

Non-secret tuning: `PAINT_PROVIDER` / `SPEAK_PROVIDER` / `MUSIC_PROVIDER` / `SFX_PROVIDER` pin a lane to one provider (mock floor kept); `DM_FALLBACK=off` disables the OpenAI DM fallback; `DM_MODEL` / `DM_MODEL_GENESIS` select Anthropic model ids. Server secrets are never exposed to the client — nothing is prefixed `VITE_`.

Media has two player-facing tiers: **Parchment** (procedural art, and silence) and **Illuminated** (painted stills, voiced narration, and music only at the turning points). The read-aloud narrator is a comfort feature available at any tier.

## Repository layout

This is a pnpm workspace; the game is one self-contained artifact within it.

```
artifacts/mydungeon-quest/   ← the game (start here)
  src/                         React 19 client — rules authority, reducers,
                               Foundry, seal, narrator, all UI
  server/                      Express 5 — DM proxy, media routes, adapters
  evals/                       the keyless proving ground
  GAME_NOTES.md, CHANGELOG.md, NOTICE.md, README.md
artifacts/api-server/        unrelated workspace API template (not the game)
artifacts/mockup-sandbox/    design-preview tooling (not the game)
lib/, scripts/               shared workspace libraries and maintenance
```

Historical design documents are preserved at the root: `REMAKE-DIRECTIVE.md` (the visual-cut directive) and `HANDOFF-REPLIT.md` (the engine-cut handoff). They are the paper trail, not the current spec — notably, the film/video pipeline they describe was retired in July 2026 in favor of painted stills; old chronicles keep their film-era keyframes as ordinary illustrations, and sealed history is never rewritten.

## Credits

MyDungeon.Quest is a **FutureSpeak.AI** production ([github.com/futurespeakai](https://github.com/futurespeakai)) — world, engine architecture, cinematic direction, and the stubborn conviction that a story you own should live on your own device.

The Dungeon Master speaks through Anthropic Claude; illustrations arrive through Google Gemini and OpenAI; voice, music, and effects through ElevenLabs. All of them are guests: optional, interchangeable, and always understudied by the keyless mock floor — though for sound, the floor the player hears is silence, never a placeholder.

Game mechanics are original logic designed to be mechanically compatible with the Systems Reference Document 5.1, licensed CC BY 4.0 by Wizards of the Coast LLC. This project is not affiliated with or endorsed by Wizards of the Coast. See [`artifacts/mydungeon-quest/NOTICE.md`](artifacts/mydungeon-quest/NOTICE.md).

Repository licensing is being finalized by FutureSpeak.AI; until then, `NOTICE.md` carries the standing attributions.
