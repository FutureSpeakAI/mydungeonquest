---
name: Playwright instrument traps
description: Waiting/clicking instruments that lie — async+interval polling, strict waitFor plurality, blind clicks vs auto-rising dialogs
---
- **`waitForFunction(async fn, arg, { polling: <ms> })` is broken** — an async predicate with interval polling resolves the unawaited Promise handle (truthy) immediately; `jsonValue()` reads null while the awaited truth stands. Default raf polling awaits properly.
  **How to apply:** poll with a one-shot `page.evaluate` loop (sleep + deadline) instead; audit every `waitForFunction` that pairs async + interval — the same pairing hides in sibling waits (it sat in TWO seats of one spec).
- **Bare `locator.waitFor()` strict-throws on plurality** — with 2+ matches it throws INSTANTLY (strict violation), indistinguishable in a try/catch from "absent." The catch then acts on a lie (e.g. clicking a door that a dialog already covers). Use `.first().waitFor()` unless singularity IS the assertion.
- **Blind clicks lose races with auto-rising dialogs** — a UI that may open its own overlay makes a bare click retry forever under "subtree intercepts pointer events," burning the whole test ceiling. Pattern: wait briefly for the target panel; knock only in the catch; both paths lawful; ONE helper for all callers (mirrors law).
- **Reporter line numbers drift; titles don't** — failure headers cite declaration lines from a possibly different file revision; trust the test TITLE and the call-log excerpt.
- **"element is not stable" early phases are usually entrance animations** — the meaningful obstruction often appears LATER in the call log; read the whole log, never just the head. A boundingBox+getAnimations probe settles "what moves" in one run.

## Fixed-sleep reads race the DOM under bench load (second of the family)
- A single read N ms after an action races async state flush when parallel workers saturate the CPU — the instrument reads a stale value and convicts an innocent control. Poll until a deadline instead; keep the assert untouched.
- Series record: 58C hearth ghost (first), 64.12 forge-die phantom misses (second). OWNER LAW: a third bench-load race in this family is blocker-grade on sight and triggers a bench-serialization review as instrument work before any further counted run.
- Cured-on-sight instrument fixes get VALIDATED before they are counted on: reproduce the court at load (repeat-each × workers on the one test, no byte moved) and attest the tally in the ledger.
