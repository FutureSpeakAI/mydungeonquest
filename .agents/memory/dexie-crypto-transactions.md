---
name: Dexie crypto-in-transaction premature commit
description: Why appendEvent-style seals break in real browsers and how MyDungeon.Quest works around it
---

# Dexie "Transaction committed too early" from async crypto inside a tx

**Rule:** Never `await crypto.subtle.*` (or any non-Dexie promise) inside a
`db.transaction('rw', ...)` and then do another Dexie op afterward. Real
IndexedDB auto-commits the transaction the moment the microtask queue drains
with no pending IDB request; the async crypto gap triggers that, so the next
`db.put`/`update` throws `DexieError: Transaction committed too early`.

**Why:** In MyDungeon.Quest the protected `seal.js` `appendEvent` does exactly
this — `signerFor` (Ed25519 `generateKey`), then `makeEnvelope` (`sha256` via
`crypto.subtle.digest` + `sign`), then `db.journal.put` / `db.campaigns.update`,
all inside one `rw` transaction. A lone seal often survives (fast/racy), but the
`illuminated`/`cinema` media tiers fire several concurrent `media_attestation`
seals around each turn; the overlapping crypto-gapped transactions reliably
premature-commit and the turn fails with "The road snagged: Transaction
committed too early." Chromium made it worse by actually supporting Ed25519 (so
the slow async sign path runs instead of a sync fallback).

**How to apply:** seal.js is protected, so the fix lives in the presentation
layer (App.jsx): a `seal()` wrapper that rebuilds the identical record via the
engine's *exported* `makeEnvelope`, running all crypto OUTSIDE the transaction,
then opens a tx that does ONLY synchronous Dexie ops (`journal.put` +
`campaigns.update`). All seals are chained through one module-level promise
(`__sealChain`) so head-hash reads/writes never interleave (no chain fork).
If you ever must keep crypto inside a Dexie tx, wrap it in `Dexie.waitFor(...)`.
Serialization ALONE does not fix it — a single seal still gaps on crypto; the
real fix is moving crypto out of the tx. (Current code: `appendEvent` itself
now rides `Dexie.waitFor(makeEnvelope(...))` inside its own tx — both patterns
stand; waitFor suits low-frequency seals, the outside-crypto wrapper the hot
turn/media path.)

## The once door (exactly-once records)
Check-then-write across await boundaries duplicates seals: two parallel callers
both judge a snapshot eligible, both append, and the journal carries two records
of a once-only kind. The chain stays VALID — each seal chains on the other —
which is exactly why nothing crashes while the audit trail silently lies (turn
count two ahead of the one visible row). **Cure:** the guard lives INSIDE the
writer's own transaction — an `opts.once` on `appendEvent` counts standing
records of that type for the spine and answers null instead of writing;
exactly-once by construction, callers stand down to the standing record.
Snapshot checks stay as cheap pre-filters, but the DECIDING read is in the tx,
against the row as persisted now — never the caller's snapshot.
