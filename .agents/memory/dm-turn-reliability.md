---
name: DM turn reliability (mydungeon-quest)
description: Why live Anthropic DM turns fall back to generic narration and how the contract keeps them valid.
---

# DM turn reliability

The client-side `validateDmTurn` (in `src/lib/protocol.js`) is STRICTER than what
Anthropic's tool-calling contract can express. A turn can be schema-valid to the
model yet rejected by the client, which then shows the player `safeFallbackTurn`
(generic filler). The headless `evals/run.mjs` only exercises the mock DM, so it
never catches these. `evals/live.mjs` drives real Anthropic turns end-to-end
(genesis, rolls, combat start/update/end, cinematics) and is the harness that
surfaces them (`pnpm --filter @workspace/mydungeon-quest run eval:live`, needs
`ANTHROPIC_API_KEY`).

## The gap that JSON schema cannot enforce
- **Word counts** are not expressible in JSON schema. Real failures seen:
  narration total over the 20-180 word cap (e.g. 181, 219) and suggestions over
  the 6-word cap. Fix = state the exact budgets in the system prompt (OUTPUT
  CONTRACT), not by relaxing the validator.
- **Nullable keys get dropped.** The model intermittently omits `required`
  nullable fields (esp. `story`), which `validateDmTurn` treats as missing.
- **Hallucinated fields.** Under combat pressure the model has put a `line` field
  inside a narration block (only `text`/`speaker` are allowed).

## The durable rule
Any constraint the validator checks that the JSON schema cannot express MUST be
spelled out in `buildSystemPrompt` (`src/lib/systemPrompt.js`) — e.g. the 60-140
(hard max 180) narration word budget, the 6-word suggestion cap, "emit every
field, never omit story", and "narration blocks carry only text/speaker".
Keep the prompt in lockstep with `validateDmTurn`. Never fix a live failure by
loosening the validator.

**Why:** the validator is the client's integrity guarantee; loosening it lets bad
turns corrupt the codex/state. The model only knows a limit if the schema OR the
prompt states it.

## Repair-retry (the reliability backstop)
`server/dm.js#getDmTurn` gives the model ONE self-repair attempt before falling
back: on validation failure it re-calls Anthropic with the prior (invalid)
`dm_turn` as an assistant `tool_use` plus a `tool_result` (`is_error: true`)
listing the exact violations, then forces the tool again. This turns intermittent
per-turn deviations into rare compound events without weakening the validator.
Network/API errors get a plain retry (no repair payload).

**How to apply:** if you tighten `validateDmTurn`, mirror the new rule in the
system prompt's OUTPUT CONTRACT and re-run `eval:live` a few times (the model is
nondeterministic — one green run is not proof).
