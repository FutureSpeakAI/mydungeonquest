# DM Model Audition — July 20, 2026 (Task 54)

Keyed probe: `tests/e2e/tools/dm-model-audition.mjs` (never part of the keyless
eval chain). Each candidate replayed four representative briefings through the
**real Anthropic door** — the exact shaped request the DM sends (anchored
history window, cache breakpoints, 1-hour candle, forced `dm_turn` tool, no
`temperature`) — and every draft was judged by the exported turn court
(`judgeTurn`), with the door's own one-repair law on a first-pass rejection.

## Turn shapes

1. **genesis** — Session Zero: arc + villain + family + region + gear +
   chapter cinematic + beat 1, all in one seal (the most demanding turn).
2. **mid-story** — ordinary beat with standing cast, memory, and threads.
3. **combat-start** — sealed bestiary species, `op: start`, initiative law.
4. **crowded-cast** — five standing souls in one moot-hall scene.

## Candidates

Drawn live from `GET /v1/models` on audition day: baseline
`claude-sonnet-4-6`, `claude-haiku-4-5` (+ dated snapshot
`claude-haiku-4-5-20251001`), `claude-sonnet-5`, `claude-sonnet-4-5-20250929`.
(Opus ids skipped — never cheaper; `claude-fable-5` skipped — not a
sonnet/haiku turn-teller.)

## Results (4 turns per model)

| model | first-pass valid | post-repair valid | fallback turns | mean latency | mean $/turn* |
|---|---|---|---|---|---|
| claude-sonnet-4-6 (baseline) | 1/4 | **4/4** | 0 | ~30.5 s | ~$0.037 |
| **claude-sonnet-5** | 2/4 | **4/4** | **0** | **~15.5 s** | **~$0.032** |
| claude-haiku-4-5 | 2/4 | 2/4 | 2 | ~12.0 s | ~$0.009 |
| claude-haiku-4-5-20251001 | 1/4 | 3/4 | 1 | ~12.1 s | ~$0.011 |
| claude-sonnet-4-5-20250929 | 1/4 | 3/4 | 1 | ~23.1 s | ~$0.034 |

\* Cache-aware billing (input/output/cache-write/cache-read at family rates)
summed over first pass + any repair. Probe turns pay cache-write-heavy prices;
real campaigns bill most input at cache-READ rates under the anchored window,
so live per-turn cost runs materially lower — the ratios between models are
what the audition weighs.

Notes: an earlier partial run agreed within noise (sonnet-4-6 dropped its
genesis to fallback once there; both runs of the haiku ids dropped ordinary
turns). Low first-pass rates across the board are the strict client court
doing its job; the repair loop is the contract, and what disqualifies a model
is failing **after** repair.

## Verdict

- **DM default: `claude-sonnet-5`** — post-repair validity equal to the
  sonnet-4-6 baseline (4/4), **no** fallback turns, ~half the latency,
  cheaper per turn. Cheapest model with no rise in fallback turns.
- **Genesis default: pinned explicitly to `claude-sonnet-5`**
  (`DM_MODEL_GENESIS` overrides) — Session Zero never follows a cheaper
  `DM_MODEL` override down.
- Both haiku ids rejected (fallback turns on ordinary shapes — the floor
  would speak in real play); sonnet-4-5 rejected (fallback + no price edge).
- Other artisans keep their current seats. Note: a `DM_MODEL` env override
  cascades into the Writers' Room director default
  (`DIRECTOR_MODEL || DM_MODEL || …`) and the dial probe's model list; the
  Editor/Chronicler/Smith defaults are untouched by this verdict.

## Re-running

```
node tests/e2e/tools/dm-model-audition.mjs            # full shelf
AUDITION_MODELS=id1,id2 AUDITION_OUT=/tmp/rows.jsonl \
node tests/e2e/tools/dm-model-audition.mjs            # subset, incremental rows
```

Requires `ANTHROPIC_API_KEY` (hard stop without it). Never sends
`temperature`. A call stalled past `AUDITION_DEADLINE_MS` (default 120 s)
counts as a fallback turn, mirroring what a player would experience.

## The Second Chair — the chairs stand; no verdict moves a default (Task 65, Phase 6 — Directive XX, Law XI)

Stage one built the CHAIRS, not the verdicts. Three envs seat the room's
smaller seats on their own models, resolved at call time by the one
seat-plan (`chairSeats()` in `server/room.js`), each defaulting to exactly
today's model — unset environments are byte-identical to the room as it
stands. The chair envs steer the Anthropic lane only (an Anthropic id in
an OpenAI request would be refused at the wire); the understudy lanes
keep their elder envs.

| chair | env | default today | worth auditioning |
| --- | --- | --- | --- |
| the Director's sitting | `DM_MODEL_DIRECTOR` | `claude-sonnet-4-6` (beneath it: `DIRECTOR_MODEL`, then the `DM_MODEL` cascade) | `claude-haiku-4-5` — the intent is a 400-token structured note behind its own validator and mock floor |
| the Editor's judged pass | `DM_MODEL_EDITOR` | `claude-haiku-4-5` (beneath it: `EDITOR_MODEL`) | dated haiku snapshots, or anything cheaper that still holds the verdict schema |
| the redraft's attempts | `DM_MODEL_REDRAFT` | the primary DM seat (`claude-sonnet-5`) | `claude-haiku-4-5` — the flags name the cure and the validator guards the result; the cheapest plausible win |

Never auditioned, by law: the GENESIS attempts (no chair env — nor a seat
forced into the door's own hands — moves Session Zero; `DM_MODEL_GENESIS`
alone rules there) and the FIRST TELLING's attempts (the primary seat,
`DM_MODEL`'s own law). A chair env never conjures a key: the provider
plan alone decides who may speak, and an absent key seats the mock floor
exactly as today.

**How an audition records its verdict.** Keyed, off the check (the gates
stay keyless): set ONE chair env, replay representative briefings through
the real door — the harness above, or live play — and read
`room_ledger.chair_calls`, where every call is attributed to its chair
with the seated model named and mock floors counted honestly. Judge
beside the standing courts: the intent validator's refusal rate for the
Director, the verdict schema and the revise/ship split for the Editor,
post-repair validity and fallback turns for the redraft. What
disqualifies a cheaper mind is what disqualified them at the DM audition:
failing AFTER the repair law, or dragging real play down to the
deterministic floor.

**The standing rule: a default moves ONLY on a verdict recorded in this
document** — dated, with its counts beside it, as the recorded verdicts
above are. No such verdict is recorded today; every chair defaults to the
seat it held before the chairs existed, and the `secondChair` gate holds
that byte-identity as law.
