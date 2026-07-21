---
name: Anthropic temperature retired
description: Newer Anthropic model families 400 any request carrying temperature; where the dial is lawful and where it was purged.
---

Newer Anthropic families (claude-sonnet-5 onward) reject any request carrying `temperature` — HTTP 400 `` `temperature` is deprecated for this model``. Provider-chain silent degrades EAT the 400 (patrons see fallback output, no error anywhere), so a carried dial is an invisible outage, not a loud one.

**Why:** probed live 2026-07-21 (and at the July 18 room sitting before that): lawful shape × sonnet-5 → 200; the same request with `temperature: 0` planted → 400.

**Status 2026-07-21 (probed, court-grade):** every Anthropic seat in the MyDungeon game server is clean — DM door (cured earlier), writers' room director+editor (cured July 18, law in the seats' own comments), smith (temperature is an honest-null attestation FIELD in responses, never a request param), chronicler/retellings (never carried it; `git log -S` over its history is empty). The only `temperature` request lines left are the OpenAI understudies' lawful zeros — that family still honors the dial. Queue item #55's "latent case in the retellings door" was recorded from a stale note; probe artifact lives at `docs/probes/chronicler-door-2026-07-21.md` in the game artifact.

**How to apply:** never add `temperature` to an Anthropic request. When seating a NEW Anthropic call site, probe its parameter shape × the newest family keyed (expect 200) and plant the dial once (expect 400) so the probe proves its own teeth. Expect the same family-retirement pattern on other dials; silent-degrade chains must log the fallen voice by name so a family retirement is never an invisible outage.
