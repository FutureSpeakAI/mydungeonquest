---
name: MyDungeon seen ledger & fresh cards
description: Reveal-law decisions — device-local reveals table, card ladder skip rules, replay exemption, turn-salted scene cache, and the keyed card remount.
---

# The seen ledger (reveals)

**Rule:** The `reveals` Dexie table (v2) records which painted assets were actually SHOWN (kind `plate` | `card`) per campaign. It is a device-local observation: never sealed into the journal, never exported with chronicles, never synced to the vault, burned with the campaign (pyre law). First showing wins (`add`, not `put`).
**Why:** Retellings promised "as actually seen" (downstream consumer) and the card ladder needs a truth-source for "already dealt". Sealing or syncing it would turn a UI observation into contested canon and break chain verification of old journals.
**How to apply:** Any new surface that displays painted art should mark reveals; any future vault/export work must keep excluding `reveals`. Readers must tolerate an empty ledger (never load-bearing).

# The reveal law in the card ladder

**Rule:** Every rung of the Cinematic still ladder (beat key → turn hash → latest scene → latest paint) filters art already revealed as a `card`; the procedural gradient is the honest last resort. Codex replays are exempt both ways: they neither filter nor mark (a re-view is not a new reveal).
**Why:** Chained DM→act cards and lagging paints used to deal the same cover twice "as new" — a user-visible repeat complaint.

# The fresh-card key (React batching trap)

**Rule:** `setCinematic(null); setCinematic(next)` inside one callback batches — React reuses the mounted component, so per-card lifecycles (asset resolution, ledger marks, the 9s close timer) never restart. `<Cinematic>` carries a per-card `key` (type:title:beat:replay) to force a remount; chained pairs always differ in type.
**Why:** Architect-flagged HIGH: without the key the chained act card reused the DM card's backdrop and got no fresh close timer.
**How to apply:** Any overlay chained through a single close callback needs identity in its `key`, not just changed props.

# One turn, one painting

**Rule:** Scene paint jobs pass `cacheKey scene:${campaignId}:${turnRecordHash}` — content-hash caching alone collapses similar prose into one painting. Same-turn re-queues (reopen, refused pour poured again) cache-hit their own plate. Brief variety comes from the turn's prose slice + deterministic 8-way framing wheel seeded by the record hash; subjects/appearance canon/reference anchors stay untouched.
**Why:** Unsalted `generationSpec` hashes deduped "similar words" across turns — players saw the same painting every turn.
