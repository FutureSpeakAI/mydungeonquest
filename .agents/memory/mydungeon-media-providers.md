---
name: MyDungeon.Quest media providers are opt-in
description: Why generated art looks like abstract placeholders and how to get real painted media
---

# Media adapters serve MOCK unless *_PROVIDER env is set

**Rule:** `server/adapters/index.js` selects real providers ONLY when the
matching env is set: `PAINT_PROVIDER=openai` (+`OPENAI_API_KEY`),
`VIDEO_PROVIDER=openai|replicate`, `SPEAK_PROVIDER=elevenlabs|openai`,
`MUSIC_PROVIDER=elevenlabs`. Otherwise every kind falls back to `mockAdapter`,
which returns deterministic gradient+noise SVGs labelled "MOCK <KIND>" and
procedural WAV tones.

**Why:** Merely having the API key present is NOT enough — unlike the DM
(`dm.js` uses Anthropic automatically whenever `ANTHROPIC_API_KEY` exists), media
generation is gated behind an explicit `*_PROVIDER` opt-in because it costs
money. This is why end-to-end visual verification of the cinematic phases shows
images rendering in the right places (mast, forge portrait, turn illustration,
codex, book film-strip) but every one looks like a dark abstract placeholder,
not "painted" art. That is expected mock behaviour, not a phase-implementation
bug. The mock floor is also what keeps the keyless `npm run check` green (the
eval asserts provider === 'mock').

**How to apply:** To demonstrate/ship real cinematic art, set the `*_PROVIDER`
envs (this incurs per-image/video API cost; default tier `illuminated` can queue
up to ~80 images per campaign). To keep it free/keyless, leave them unset and
accept placeholder aesthetics. Do NOT judge the visual phases as broken just
because mock art looks abstract — check that an `<img>`/media element renders in
the right slot instead.
