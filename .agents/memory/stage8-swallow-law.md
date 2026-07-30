---
name: Stage 8 swallow law
description: Lessons from Stage 8 M1–M5: catch-block inventory, compound Dexie index, worldId path reservation, and escalation-floor search patterns.
---

# Stage 8 Lessons

## Catch inventory criterion
A non-empty comment in a catch body IS the "justified in writing" criterion. The test only fails on completely empty `catch {}` (no comment, no code). Don't require a specific phrase like "SWALLOW-JUSTIFIED:" — existing comments qualify.

**Why:** The original test demanded a phrase pattern and flagged 27 justified blocks. The correct criterion is: "did the developer think about this?" A comment proves they did.

## Compound Dexie index beats .and() JS predicate
`.where('[campaignId+cacheKey]').equals([campaignId, key])` is strictly better than `.where('cacheKey').equals(key).and(r => r.campaignId === id)`. The `.and()` predicate deserializes ALL rows matching `cacheKey` from every campaign before the JS test runs. The compound index pushes the filter to the cursor — zero foreign rows deserialized.

**How to apply:** When a query has two equality constraints, check whether a compound index exists; if not, add one in the next Dexie version bump.

## WorldId slot in key paths — reserve before worlds land
Add `worldId` as a path segment NOW (worldId = campaignId today) rather than waiting for persistent worlds. The cost is one segment; the migration cost of adding it retroactively is every stored object. Apply: GCS key paths, DB table columns, any URL that names a campaign-scoped resource.

**Why:** Stage 9 brings persistent worlds. The retroactive migration cost was the deciding factor.

## Escalation-floor source search: use post-loop form
When verifying that `safeFallbackTurn` is the FINAL floor in dm.js (post both provider loops), don't use `indexOf('safeFallbackTurn(')` — it finds the import at line 3. Use the unique return form that only appears after both loops:
```js
"provider: 'fallback', model: 'fallback', error: lastError.message }"
```
The mock branch uses `bornAtZero(safeFallbackTurn(...))` and lacks `error: lastError.message`, so this pattern is unique to the final floor.

## Context pack false proxy (M1 finding)
Stage 6.6's "context pack grew 3× at turn 10" was a proxy measuring rendered DOM text (`.turn-entry` innerText, all turns accumulated), not the 7,000-char sliding JSON window. The two are incommensurable; DOM grows monotonically while the pack trims. The actual pack peaks at 6,482/7,000 chars with 12 souls at chapter 15 — no famine, no trim events.

**How to apply:** When measuring "context pack size" in tests, measure `JSON.stringify(buildContextPack(...)).length`, not DOM node text.
