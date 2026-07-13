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
