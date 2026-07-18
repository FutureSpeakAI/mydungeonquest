---
name: DM turn reliability (mydungeon-quest) — "Asimov's cLaws"
description: Why live Anthropic DM turns fall back to generic narration and how the law stack keeps them valid. "Asimov's cLaws" is the user's name for this system.
---

# DM turn reliability — "Asimov's cLaws"

**"Asimov's cLaws"** is the user's own term (July 2026; "c" = client-enforced)
for the whole law stack governing the AI DM, and it is documented publicly in
the root `README.md`: tool schema mirrors validator enums → system prompt
states what schema can't → `validateDmTurn` enforces client-side → one
repair-retry → `safeFallbackTurn`. Use that name when the user does; keep the
README section in sync when any layer changes.

The client-side `validateDmTurn` (in `src/lib/protocol.js`) is STRICTER than
what Anthropic's tool-calling contract can express. A turn can be schema-valid
to the model yet rejected by the client, which then shows the player
`safeFallbackTurn` (generic filler). The headless `evals/run.mjs` only
exercises the mock DM, so it never catches these. The dedicated live harness
(`evals/live.mjs`, `eval:live` script) was REMOVED with the July 2026 film
retirement — live-turn behavior must now be verified by playing several real
turns manually.

## The gap that JSON schema cannot enforce
- **Word counts** are not expressible in JSON schema. Real failures seen:
  narration total over the 20-180 word cap (e.g. 181, 219) and suggestions over
  the 6-word cap. Fix = state the exact budgets in the system prompt (the
  contract sections), not by relaxing the validator.
- **Nullable keys get dropped.** The model intermittently omits `required`
  nullable fields (esp. `story`), which `validateDmTurn` treats as missing.
- **Hallucinated fields.** Under combat pressure the model has put a `line`
  field inside a narration block (only `text`/`speaker` are allowed).

## The durable rule
Any constraint the validator checks that the JSON schema cannot express MUST be
spelled out in `buildSystemPrompt` (`src/lib/systemPrompt.js`) — e.g. the 60-140
(hard max 180) narration word budget, the 6-word suggestion cap, "emit every
field, never omit story", and "narration blocks carry only text/speaker".
Keep the prompt in lockstep with `validateDmTurn`. Never fix a live failure by
loosening the validator.

**Why:** the validator is the client's integrity guarantee; loosening it lets
bad turns corrupt the codex/state. The model only knows a limit if the schema
OR the prompt states it.

## Repair-retry (the reliability backstop)
`server/dm.js#getDmTurn` gives the model ONE self-repair attempt before falling
back: on validation failure it re-calls Anthropic with the prior (invalid)
`dm_turn` as an assistant `tool_use` plus a `tool_result` (`is_error: true`)
listing the exact violations, then forces the tool again. This turns
intermittent per-turn deviations into rare compound events without weakening
the validator. Network/API errors get a plain retry (no repair payload).

**How to apply:** if you tighten `validateDmTurn`, mirror the new rule in the
system prompt, update the cLaws section of the root README, and spot-check a
handful of live turns (the model is nondeterministic — one green run is not
proof).

## The law amendment (July 2026): the dead do not speak
`validateDmTurn(payload, entropy, context)` takes an OPTIONAL third argument —
`context.cast`, the PRE-turn codex cast snapshot (`[{name, status}]`). Dialogue
(narration-block speaker or dialogue_cue) attributed to a name whose status is
`dead` fails the whole turn; dying words stay lawful because the snapshot
predates the turn's own `cast_update`.

**The trap:** because the parameter is optional, a call site that forgets to
thread the snapshot silently DISABLES the law — no error, nothing fails. Any
new `validateDmTurn` call site must thread `{ cast }` (grep existing call
sites for the pattern) or the dead may speak there. Matching is alias-aware —
a bare first name reaches its soul — and when a name could mean both a living
and a dead soul, the living one is presumed to speak (block only the
unambiguous dead; never invalidate a lawful living speaker).

## Threads law (Hooked World cut)
Thread ops ride systemPrompt rules 24–25 with validateThreads in the
protocol court; lockstep now includes the pair of thread rules. The
validator checks resolve targets only when given open-thread context —
by donor design (legacy contexts pass none); the reducer is the layer
that always refuses unknown resolves and duplicate opens. If either arm
changes, re-prove both: validator-with-context refusal AND reducer
refusal with empty context.

## Every bench seats the same evidence (0.7.2 review finding)
validateDmTurn convenes a court iff its evidence key is seated
(party/presence/fixtures arrays, hero string) — absent evidence means
the court is silently OUT OF SESSION, not failing. When the validator
grows a new evidence-gated court, grep EVERY validateDmTurn call site
and seat the new evidence at each — or accept explicitly that a bench
sits it out (the eval runner's {cast}-only seating is the one
deliberate exception). Cleanest client source: seat the landing from
the same story briefing the request carried, so both benches judge
byte-identical evidence.
