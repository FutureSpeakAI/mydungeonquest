---
name: Engine folds resolve queues backwards
description: Some engine folds (e.g. the atlas placement fold) iterate their work queue tail-first, so same-pass duplicates resolve later-card-first.
---

**Rule:** When gating an engine fold that drains a queue with `for (i = queue.length - 1; i >= 0; i--) ... splice`, do NOT assert which of two same-pass conflicting entries wins. Assert the *outcome laws* instead: exactly one resolution exists, the conflict raises the named refusal, and the result is deterministic.

**Why:** The atlas fold (`buildAtlas`) walks its queue backwards for splice safety, so on the first pass the LAST card in the array resolves first and locks the position; the refusal fires against the EARLIER card. A gate asserting "first card in array order wins" was red even though the engine's law ("positions lock at first resolution") held. Engine files are protected — the gate had to match the fold, not the other way around.

**How to apply:** In game-side gates over engine folds, prefer assertions on set-cardinality ("one name, one place"), refusal presence/wording, and byte-determinism over intra-pass ordering. Record order ≠ resolution order whenever the queue drains tail-first. Also note: in the real game record such duplicates often cannot arise at all (e.g. region_add dedupes by canon name), so the attack fixture is synthetic — gate it as an attack, not as canon behavior.
