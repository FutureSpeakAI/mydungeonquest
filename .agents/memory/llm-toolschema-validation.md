---
name: LLM tool schema must mirror strict validators
description: Silent mock/fallback when a tool-calling JSON schema is looser than the app validator
---

# A tool-calling JSON schema must mirror the app's strict validator

When an LLM emits structured output via a tool/function-call JSON schema, and the
application then re-validates that output against a stricter validator, any enum
or shape the validator enforces but the tool schema omits will eventually be
violated: the model produces plausible values that are valid per the loose schema
but rejected by the validator. The typical symptom is that real model calls
silently fall back to a built-in default/mock response while mock/offline paths
look fine.

**Why:** newer/flagship models fill under-specified fields with reasonable-but-
out-of-range values (e.g. a dice notation, cinematic type, or combat op the
validator restricts to a fixed set). The failure is silent because the fallback
path swallows it.

**How to apply:** keep the tool schema's enums/constraints in lockstep with the
validator (mirror them, don't loosen the validator). When a real integration
"works but ignores the model," check whether validation is failing and a fallback
is masking it before assuming an API/model problem.

## Addendum (TASK 58B, July 2026): bounds are advisory, and courts must read the lock

- `maxLength` (and soft bounds generally) in tool schemas are ADVISORY to Anthropic models — they emit over-bound strings anyway. A bound the model reliably honors rides FOUR seats, all derived from the one fence table: schema `maxLength` + a per-property `description` ("At most N characters."), a system-law sentence binding all schema bounds (listless — names the contract, not values), and a hard-wall line in the ask.
- Redraw/retry notes must carry the validator's refusals BY NAME as data — a fresh deal that cannot see why the last one fell keeps falling the same way. Feedback converges in 1–2 redraws where blind redraws burned the whole ceiling.
- Valid-but-rejected has a LOCK-shaped variant: when a validator conditions on locked/settled context (e.g. rider fields must cohere with a LOCKED className), the schema must express the settled values (enum-of-one from the same table), and covariant tables the schema cannot express flatly should ride the user message as data ("copy the dealt calling's body exactly").
- The dual failure: validators that condition on lock context must READ it — a court that only inspects candidate bytes is fail-open for exactly the deals where the lock carries the governing fact (candidate omits the locked key by law). Enforce from `candidate.value ?? locked.value`.
- Cap `max_tokens` generously for multi-candidate tool calls: a truncated tool JSON parses to nothing and silent-fallback architectures eat the evidence.
