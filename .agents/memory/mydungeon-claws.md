---
name: MyDungeon CLAWS.md — canonical rules location
description: docs/CLAWS.md is the canonical home for all standing laws (Rules 18–27) and the pin-move law.
---

`artifacts/mydungeon-quest/docs/CLAWS.md` is the authoritative home for the project's standing laws.

Rules defined there: 18 (one surface), 19 (provider plan), 20 (validator+schema), 21 (campaign isolation), 22 (instrumentation ≠ surface), 24 (record survives the code), 25 (export always works), 26 (claim only what the tool can see), 27 (refusal is loud failure).

**Pin-move law** (documented in CLAWS.md): any commit that changes the closure bytes MUST update BOTH `soulsWeb.test.mjs` (CLOSURE_BYTES_PIN) and `leanDoor.test.mjs` (PIN_KB) in the same commit. The ratchet is downward-only between owner rulings.

**Gate:** `evals/docsCurrent.test.mjs` verifies CLAWS.md exists with key content and both pins cross-point each other.

**Why:** Rules were previously scattered in eval headers and source comments only. CLAWS.md is the single readable reference for any new gate or source author.
