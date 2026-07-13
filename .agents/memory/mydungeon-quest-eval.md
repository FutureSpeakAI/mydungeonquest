---
name: MyDungeon.Quest eval is keyless-only
description: Why `npm run check` fails in this repl unless AI keys are unset
---

# MyDungeon.Quest `npm run check` must run keyless

The game's headless bench (`artifacts/mydungeon-quest/evals/run.mjs`) hard-asserts
`provider === 'mock'` for the DM streaming-parity test. This repl has
`ANTHROPIC_API_KEY` (and OPENAI/ELEVENLABS/GEMINI/GOOGLE) set as secrets, so the
DM adapter correctly selects the real provider and the eval fails with
`actual 'anthropic' - expected 'mock'`.

**Rule:** run the bench with the AI keys unset, e.g.
`env -u ANTHROPIC_API_KEY -u OPENAI_API_KEY -u ELEVENLABS_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY npm run check`.

**Why:** the project's design mandate is "keyless first" — all acceptance tests
must pass with mock providers. The eval encodes that; it is not a bug.

**How to apply:** whenever verifying the game builds/evals green (after each
visual phase per REMAKE-DIRECTIVE.md), invoke the bench keyless. The dev/prod
workflow still uses the real keys at runtime — this only affects the eval.
