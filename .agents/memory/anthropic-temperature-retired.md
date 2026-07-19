---
name: Anthropic temperature parameter retired
description: New Anthropic model families 400 any request carrying temperature; silent degrade paths eat the error and quietly serve fallbacks.
---

**The rule:** Do not send `temperature` (any value, including 0) in Anthropic messages requests for current model families (observed July 2026, model resolving to the claude-sonnet-5 family): the API returns 400 "temperature is deprecated for this model". If a "pinned temperature" matters to the product, declare it as evidence/metadata (honest-null for live calls that cannot set it; the mock tier may still declare its own).

**Why:** In MyDungeon.Quest the smith sent `temperature: 0.9` — every live call 400'd and the degrade-to-mock-never-error path seated the mock floor silently. Nothing crashed; the feature simply never went live. Only an in-process probe with an instrumented fetch surfaced the 400.

**How to apply:**
- Grep for `temperature` before shipping any Anthropic call site; remove the parameter rather than tuning it. Sweep EVERY seat in a multi-provider file — a cured Director beside an uncured Editor in the same file survived two audits before an architect review caught it (cured July 2026; only OpenAI seats may keep the dial).
- Silent-fallback architectures hide provider 400s by design: when a "live" tier mysteriously serves mock output, probe the provider call directly with an instrumented fetch and read the error body before touching prompts or schemas.
