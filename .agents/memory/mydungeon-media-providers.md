---
name: MyDungeon.Quest media + DM provider chains
description: How media/DM providers are selected, which secret each uses, and the mock floor
---

# Provider selection is auto-chained with a mock floor

**Rule:** `server/adapters/index.js#providerChains()` builds an ordered,
try-until-success chain per media kind, filtered to whichever provider keys are
present, always ending in `mockAdapter`. `server/index.js#runChain()` walks it
and returns the first success; each fall-through is logged. Preference order:
- paint: gemini → openai → mock
- video: gemini → openai → replicate → mock
- speak: elevenlabs → openai → mock
- music / sfx: elevenlabs → mock
DM (`server/dm.js`): Anthropic primary (auto when `ANTHROPIC_API_KEY` set),
then an OpenAI chat/tool-call fallback held to the SAME `toolSchema` +
`validateDmTurn`, then generic `safeFallbackTurn`.

**Secrets each provider reads:** gemini → `GEMINI_API_KEY` || `GOOGLE_API_KEY`;
openai → `OPENAI_API_KEY`; elevenlabs → `ELEVENLABS_API_KEY`; anthropic →
`ANTHROPIC_API_KEY`. Per-kind override env `PAINT_PROVIDER` /`VIDEO_PROVIDER`/
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
- **Veo model names drift and are key-specific.** `veo-3.0-fast-generate-001`
  404s (`not found ... or not supported for predictLongRunning`). Query
  `GET v1beta/models?key=...` and pick a name whose `supportedGenerationMethods`
  includes `predictLongRunning` — currently `veo-3.1-fast-generate-preview`
  (also generate/lite -preview). Never assume a Veo model ID; list first.
- **Sora (OpenAI video) only accepts seconds ∈ {4,8,12}** — any other value
  400s (`invalid_value` on `seconds`); the adapter snaps to the nearest.
- **The CodeExecution sandbox's secret copy can differ from the workflow's.**
  A `requestSecrets`/sandbox read of `GEMINI_API_KEY` returned an *invalid* value
  while the same-named secret in the running workflow env was valid and worked.
  Trust a live workflow request (curl the running server) over a sandbox key
  test before concluding a key is bad.
- Genuine account blockers do exist and only the user can fix them: OpenAI
  `billing_hard_limit_reached`, ElevenLabs free-plan 402 (`paid_plan_required`).
  But confirm against the running workflow first — they can also be transient.
