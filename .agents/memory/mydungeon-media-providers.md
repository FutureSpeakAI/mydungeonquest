---
name: MyDungeon.Quest media + DM provider chains
description: How media/DM providers are selected, which secret each uses, the mock floor, and the film/video retirement decision
---

# Films/video are RETIRED from the product (July 2026, user-directed)

**Rule:** there is no video generation, no `/api/video` route, no `video` media
kind, no `cinema` tier, and no `<video>` element anywhere. Cinematics are
painted-still title cards. Do NOT reintroduce any of it.
**Why:** user said "let's take the videos out completely" after film generation
proved slow/unreliable relative to its value.
**Legacy compat contract (locked by evals/mediaFallback.test.mjs):**
- Sealed logs are immutable — old logs may carry `videoUrl`/`videoPosterUrl`/
  `videoFailed`. LogEntry renders the poster as a normal still plate and must
  never mount a `<video>`.
- Old `kind: 'video'` media rows in IndexedDB are ignored, never deleted.
- Legacy `mediaTier: 'cinema'` (settings or campaign) is coerced to
  `'illuminated'` on load/open/import; Foundry no longer special-cases it.

# Provider selection is auto-chained with a mock floor

**Rule:** `server/adapters/index.js#providerChains()` builds an ordered,
try-until-success chain per media kind, filtered to whichever provider keys are
present, always ending in `mockAdapter`. `server/index.js#runChain()` walks it
and returns the first success; each fall-through is logged. Preference order:
- paint: gemini → openai → mock
- speak: elevenlabs → openai → mock
- music / sfx: elevenlabs → mock
DM (`server/dm.js`): Anthropic primary (auto when `ANTHROPIC_API_KEY` set),
then an OpenAI chat/tool-call fallback held to the SAME `toolSchema` +
`validateDmTurn`, then generic `safeFallbackTurn`.

**Secrets each provider reads:** gemini → `GEMINI_API_KEY` || `GOOGLE_API_KEY`;
openai → `OPENAI_API_KEY`; elevenlabs → `ELEVENLABS_API_KEY`; anthropic →
`ANTHROPIC_API_KEY`. Per-kind override env `PAINT_PROVIDER` / `SPEAK_PROVIDER` /
etc. FORCES a single provider (chain becomes `[forced, mock]`, dropping the rest
of the fallbacks) — so leave them UNSET to keep the full chain; set to `mock` to
force placeholders. `DM_FALLBACK=off` disables the OpenAI DM fallback.

**Why:** the app's whole premise is painted cinematic art, but real generation
costs money and keys/plans are often not actually usable. Auto-select + mock
floor keeps the game playable and the keyless `npm run check` green (no keys →
all mock; the eval asserts provider === 'mock').

**How to apply:** if generated media looks like abstract gradient/tone
placeholders, a real provider is throwing and it fell to mock — check the
workflow log for `[kind] provider <name> failed: ...`.

Gotchas seen live (all verified working once fixed):
- **The CodeExecution sandbox's secret copy can differ from the workflow's.**
  A `requestSecrets`/sandbox read of `GEMINI_API_KEY` returned an *invalid* value
  while the same-named secret in the running workflow env was valid and worked.
  Trust a live workflow request (curl the running server) over a sandbox key
  test before concluding a key is bad.
- Genuine account blockers do exist and only the user can fix them: OpenAI
  `billing_hard_limit_reached`, ElevenLabs free-plan 402 (`paid_plan_required`).
  But confirm against the running workflow first — they can also be transient.

## Tier semantics & the narrator (podcast playback)
- Media tiers: parchment = procedural only; **illuminated = painted stills + the whole audio layer (narration voice, beat score, SFX)**. These are the only two tiers now (see film retirement above).
- The interactive-podcast narrator reads each turn via `/api/speak` **directly, bypassing the Foundry tier gate** — hearing the story aloud is a comfort setting available at any tier. Do NOT re-gate narration.
- **Why:** users on the default illuminated tier expected painted scenes + audio; gating audio made the app look/sound dead. A single scene paint is requested every turn (fallback image_cue synthesized from narration when the DM returns null).
- Single-audio playback controllers that generate audio async MUST guard after every `await` with a monotonic session token (bumped on stop/start) or fast successive/auto-play calls overlap into multiple simultaneous voice tracks.
- `/api/quest-audio` (ffmpeg concat + ducked bed) needs its large `express.json` limit mounted on the route BEFORE the global 25mb parser, else long quests are rejected 413.
