---
name: MyDungeon writer's room
description: The room/curtain/pour laws, the G24 prose court shape, the prose-store freshness door, harness walk manners (chained roll asks), and the Second Chair seat envs.
---

**The room (Experience-Directive XI).** Director / Voice / Editor / Art Director deliberate behind `/api/dm` — the ONE door; exactly one validated dm_turn enters the record per turn and the player sees nothing until it has. Drafts die unseen behind the curtain; the record never retracts (the pour only grows — g05 seals a pour witness with an empty retraction ledger).

**Editor courts:** no eight-word echo run in a twenty-page window (pads are SALTED — unsalted pads echo each other and convict falsely); cliche density ≤ 2 lexicon hits per 1000 chars; offered roads must differ; Law X — a caption DESCRIBES its plate in whole sentences, never quotes narration. Mock captions predate the law and ride free as legacy.

**G24 prose court:** six criteria over the run's OWN shipped prose through one probe script (law in one seat). G24w freshness door: prose store sealed under a sha of the writer's-room law files; law moved → raze + reseed with one mock walk (no paint, no judge dice). The door demands law-match AND session presence — a wedged walk self-heals next sitting because the session never landed.

**Harness walk manners:** the composer textarea LEAVES the DOM while a roll ask stands (the roll button takes its seat). One rollIfAsked per step is not enough — resolutions can carry CHAINED asks. Drain `while (await rollIfAsked(page))` until quiet, then wait `.composer textarea:not([disabled])` before acting. Symptom otherwise: fill retries forever on disabled-then-detached composer.

**Probe-shells dodge the spec-loader:** standalone .mjs tools run by execSync from specs keep court logic out of the playwright ESM loader's reach; specs stay thin clients that furnish exactly what the court is owed.

**Court lever — forcing the revise→redraft walk deterministically:** seed `input.history` with an assistant row equal to `safeFallbackTurn(player, turn).narration_blocks[0].text`. An all-stalled walk's fallback draft then shares the full 8-word echo run with certainty, so the judged pass and the single redraft both fire without touching editor internals (used by the pensClock worst-case ceiling court).

**Court lever — forcing 'sameness' deterministically:** probe a convene once to LEARN the mock draft's `turn.suggestions`, then replay the SAME input with `story.prior_suggestions` set to those roads — the mock does not dodge priors, so the sameness court convicts with certainty and the revise→redraft walk fires (secondChair court 5; the echo lever above remains for all-stalled walks).

**The Second Chair (XX, Law XI):** three envs (`DM_MODEL_DIRECTOR/_EDITOR/_REDRAFT`) seat the smaller chairs — Anthropic lane ONLY (an Anthropic id in an OpenAI body is a wire 400, so understudy lanes keep their elder envs). ONE seat-plan `chairSeats()` (room.js) builds its redraft lane on dm.js's exported `dmSeats()` — never mirror the primary default (mirrors-one-seat law). Genesis immunity is STRUCTURAL: `dmSeatModels` rules the genesis branch before reading any seat, both lanes; only the convene's redraft call passes a seat into `getDmTurn`. `room_ledger.chair_calls` rows ({chair, provider, model}) are written as calls are spent — floors named 'mock'/'fallback' honestly, cache hits write nothing. **Why:** owner's law — defaults move ONLY on a verdict recorded in docs/dm-model-audition.md (none written); unset envs must stay byte-identical forever. **How to apply:** any new room seat gets its chair from chairSeats at call time; never read a chair env at module scope; never let a seat near a genesis attempt.
