---
name: Context Budget Work Order
description: Findings and decisions from the five-part context budget work order (Parts 1–5 complete).
---

## Outcome summary

All five parts complete. PACK_BUDGET raised from 7,000 → 32,500; BRIEF_BUDGET from 7,800 → 33,000.

## Part 1 — Constants consolidated

`PACK_BUDGET` and `BRIEF_BUDGET` exported from `packages/engine/src/graph.js`. Nine files updated to import instead of hardcode. `evals/budgetLiteral.test.mjs` guards the invariant (checks for `\b32500\b` / `\b33000\b` outside the canon file).

## Part 2 — Cache split STOPPED

Stable block at chapter 15 (11 souls): **536 tokens**.
- Anthropic documented minimum: 1,024 tokens
- Observed minimum (SDK issue #1194, open Jun 2026): 2,048 tokens
- Root cause: pack architecture slims 7/11 souls at chapter 15 → ~12-15 chars canonical per slim soul. Even 11 fully-rendered souls ≈ 770 tokens — still below 1,024.
- A redesign keeping ALL souls' full canonicals in a stable registry could reach ~1,750 tokens at 25 souls — but that's a different, larger architecture not in this work order.

## Part 3 — Budget derived from target shape

Target: `buildTargetCampaign(15)` — 25 souls (buildDeepCampaign20 [19] + 6 EXTRA_SOULS_C), chained saga memoir, 5 regions, all thread-holders.

Unfenced pack: 24,796 chars. Unfenced brief: 25,231 chars.

```
PACK_BUDGET  = ceil(24796 × 1.30) → nearest 500 = 32,500  (31.1% margin)
BRIEF_BUDGET = ceil(25231 × 1.30) → nearest 500 = 33,000  (30.8% margin)
```

**Why 30%:** Famine sleeps for the target shape; fires for ~40+ fullSet souls. See derivation comment in `packages/engine/src/graph.js`.

## Part 4 — Famine proved at new budget

New famine fixture: `buildNewFamineFixture()` = target (25 souls) + 100 wayfarer REST souls → 34,989 chars unfenced, overflows 32,500 by 2,489. 25 wayfarers dropped; all 19 scene souls survive; all Graph Laws hold.

`kinship.test.mjs` uses a local `KINSHIP_PRESSURE_BUDGET = 8_000` for the adversarial-seating proof — the production budget is now large enough that famine never fires for the 44-soul kinship fixture. The pressure constant is NOT the exported PACK_BUDGET.

## Part 5 — March results

Old budget at chapter 15, target shape: **famine was silently dropping 5 souls every turn**. New budget: 0 dropped. Cost delta: **+1.6%** (not ~40% — the old budget was a compressor, still serving ~24,728 chars after trim).

| Chapter | Souls | Brief chars | $/turn |
|---------|-------|-------------|--------|
| 1 | 4 | 7,405 | $0.01121 |
| 5 | 20 | 18,881 | $0.01982 |
| 10 | 25 | 24,966 | $0.02439 |
| 15 | 25 | 25,231 | $0.02458 |
