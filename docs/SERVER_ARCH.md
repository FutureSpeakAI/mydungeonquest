# Server Architecture Decision — Stage 8 / M5

**Question:** Does the device become a cache, or does the server become a mirror?

This document is a recommendation, not a decision. The decision is Stephen's.

---

## Background

Today every campaign record lives on the player's device (IndexedDB). The
server is stateless except for the DM API and the watchtower. Stage 9 brings
server-side persistence. The architecture choice made here determines offline
behavior, conflict resolution, the purpose of the seal, and how much of the
existing client changes.

---

## Option 1 — Server authoritative, device caches

**Shape:** The canonical record lives on the server. The client holds a
working copy that is always treated as a cache.

**Cost:**
- Server must store campaign records, journal rows, and media references.
- Every write goes to the server before it is confirmed locally.
- Full client rewrite: every path that reads or writes campaign state touches
  a server call instead of IndexedDB.
- Cold-start latency on every turn (or an optimistic-write model that re-
  introduces the conflict problem).

**Failure modes:**
- No network = no play. The client has no way to advance a turn it cannot
  confirm with the server.
- Partial writes are possible if the client goes offline mid-turn before
  the server confirms.
- Requires transactional server writes for the journal chain (one row per
  turn, with the prevHash constraint) — a relational schema or an event-store.

**Effect on the existing client:**
- The entire seal, vault, IndexedDB, and journal stack is replaced or
  becomes purely local scratch that is immediately overwritten by the server.
- The sealed chronicle remains available (the server is the authority), but
  the "your device, your key" signing model is gone.
- The most work of the three options. Not a migration path.

---

## Option 2 — Device authoritative, server mirrors

**Shape:** The client continues writing the record. The server holds a
durable copy for backup, sync between devices, and publishing.

**Cost:**
- Minimal client changes today: add a sync routine that pushes journal rows
  to the server after each turn.
- Server schema is a straightforward projection of the client's IndexedDB
  layout: one row per journal entry keyed by `[campaignId, i]`, with
  `prevHash` for chain verification.
- Conflict resolution is the hard problem: if the same campaign is advanced
  on two devices, the chains diverge. One must win; the other must be
  discarded or forked. The vault's fork law handles local forks; two-device
  divergence is a new problem.

**Failure modes:**
- Two devices playing the same campaign simultaneously produce a split chain.
  The server can detect the divergence (same `[campaignId, i]` with different
  `recordHash`) but the game must choose: last-writer-wins, first-writer-wins,
  or fork-and-notify.
- Slow sync: a turn played offline is safe locally (the chain advances) but
  the server copy is stale. When connectivity returns the push succeeds unless
  another device has already advanced the chain past the same index.
- Media objects (plates, busts) are already on object storage (Stage 7). The
  sync routine needs to push only journal rows, not blobs.

**Effect on the existing client:**
- The seal and vault remain meaningful. The server holds the chain for
  durability, but the client's signed chain is still the authoritative record
  for a single device.
- The sync layer is new, but the game loop is unchanged.
- The closest to today. The most tractable migration path.

---

## Option 3 — Server authoritative with an offline queue

**Shape:** The server is the authority. The client queues turns locally when
offline and replays them on reconnect.

**Cost:**
- Client maintains a local queue of unsynced turns (each is a full journal
  row + DM turn). The queue drains when connectivity is restored.
- Server validates and applies queued turns in order. Because the chain is
  append-only (each row carries `prevHash`), replay is more tractable than
  in a mutable-record model: a queued row either extends the chain cleanly
  or was displaced by a conflicting write and must be discarded.
- Requires the server to run the DM and validators (or accept pre-validated
  turns from the client, which requires trust decisions).
- More work than Option 2 but not as much as a full Option 1 rewrite: the
  client's local store becomes the queue buffer, not a permanent cache.

**Failure modes:**
- Queue grows unbounded if the device stays offline for many turns. On
  reconnect, the server must replay the entire queue. If the queue contains
  a conflict (a turn whose `prevHash` no longer matches the server head),
  the replay fails from that point and all subsequent queued turns are lost.
- Requires explicit handling for DM turns generated offline: did the client
  run the DM locally (requires key), or does the server re-generate? If the
  server re-generates, the player sees different narration on reconnect.
- The queue must be persisted across app restarts (it is in IndexedDB today
  anyway), so the local store is still load-bearing.

**Effect on the existing client:**
- The game loop changes: every player action enqueues rather than writes
  directly. The DM response is async and the UI must handle the "pending
  sync" state explicitly.
- The seal's signing remains meaningful: a queued turn can be signed by the
  device, and the server verifies the signature before applying. This is
  actually a stronger trust model than Option 2.
- The existing IndexedDB store can serve as the queue buffer with modest
  adaptation.

---

## Alongside answers

### What happens on a plane?

**Option 1:** You cannot play. The server is the authority and the device
has no confirmed write path.

**Option 2:** You can play. The chain advances locally; turns are queued
for sync. On landing the queue pushes to the server. This is the honest
experience: the device is the authority, the server is a durability mirror.

**Option 3:** You can play, with the same mechanics as Option 2 (the queue
accumulates offline turns). The difference is what happens on reconnect.

The honest answer for Option 1 is that "you cannot play on a plane" — and
that is a legitimate product decision if stated deliberately. Options 2 and 3
both support offline play.

### What is the seal for now?

Today: "your device, your key." The player's private key signs each journal
row; `verifyChain()` proves the record was not edited after the fact by
anyone without that key.

When the server holds the record:

**Option 1:** The device key is replaced by a server-issued signature. The
player no longer has a key. The seal becomes "the server vouches for this
record," which is weaker as a trust primitive.

**Option 2:** The device key remains meaningful. The player still signs each
row; the server can verify the chain before storing it. The notary model
becomes real: a published or shared chronicle carries the player's signature,
and anyone can verify it was not edited after the fact. This is the strongest
use of the existing seal infrastructure.

**Option 3:** Same as Option 2, with the additional property that queued
turns are signed before transmission, so the server can reject tampered
queues.

If the answer is "the seal proves a published chronicle was not edited after
the fact and the signing key belongs to the player," the key stays on the
device, the notary route is Option 2 or 3, and the existing seal.js is
exactly right. If there is no answer — if the seal is unused after the server
owns the record — it should be retired rather than carried.

The recommendation below assumes the seal's purpose is chronicle notarization
(the strongest answer). If the owner's intent is different, this changes.

### Does the record schema get a worldId now?

Yes. M4.2 already adds worldId to the object storage key path (one world per
campaign today; worldId = campaignId as a placeholder). The same reasoning
applies to the database schema: adding a `worldId` column to campaign,
journal, and media rows today costs nothing and saves a migration across every
row ever written when persistent worlds land. The foreign key is `worldId →
worlds.id`; today there is one world per campaign and the column is a copy of
`campaignId`.

### What does account separation require?

The isolation work is campaign-scoped (`campaignId` filter on every query).
Accounts add a layer above worlds (`userId → worlds → campaigns`), so every
scoped query needs an additional `userId` filter. The compound index strategy
(Stage 8 M4.1) extends naturally: `[userId+campaignId+cacheKey]` replaces
`[campaignId+cacheKey]` without changing query structure.

Three things that must happen when accounts land:
1. Every `db.media`, `db.journal`, and `db.campaigns` query adds a `userId`
   filter at the index level (same pattern as M4.1's campaignId addition).
2. The presign route and serve route gain a `userId` segment in the key path
   (same pattern as M4.2's worldId addition — adding it now would be
   premature, but the slot is reserved).
3. The seal's signing key is associated with a userId, not a device. Key
   rotation on account login is required; the existing `db.keys` table will
   need a userId foreign key.

---

## Recommendation

**Option 2 — Device authoritative, server mirrors.**

Reasoning:
1. It is the closest to today. The entire client game loop, seal, vault, and
   IndexedDB stack remain valid. The migration is additive: a sync routine
   that pushes journal rows to the server.
2. The seal remains meaningful. Players retain their signing key. Published
   chronicles are notarized by the player's own key, not a server signature.
   This is the strongest trust model for a personal narrative tool.
3. Offline play works. A player on a plane advances their campaign; the server
   catches up on reconnect. The two-device conflict problem is real but
   manageable: the server detects chain divergence and surfaces a fork
   decision to the player (the vault's existing fork law is the precedent).
4. The conflict story is honest. Option 2 does not promise conflict-free sync;
   it surfaces the problem clearly rather than silently resolving it in a way
   the player did not choose.
5. Option 3 (offline queue) provides a better experience but costs more work
   and the DM-offline problem (does the client or server generate turns?) is
   a hard design question that should be decided explicitly rather than
   implicitly at implementation time.

**What Option 2 requires in Stage 9:**
- A `journals` server table: `(userId, worldId, campaignId, i, recordHash,
  prevHash, type, payload, ts)` — mirroring the client's journal.
- A `campaigns` server table: `(userId, worldId, campaignId, title, codex,
  updatedAt)` — the working codex snapshot.
- A sync route: `POST /_apiserver/sync/journal` — accepts an array of rows,
  verifies the chain, inserts into the server table.
- A worldId column added to both tables today (M4.2 reasoning applied to DB).
- Conflict detection: if a push finds the same `[campaignId, i]` already
  exists with a different `recordHash`, return a 409 and surface the fork
  decision to the player.

This recommendation is for Stephen to accept, modify, or reject. The
document will be updated in Stage 9 with the chosen approach.

---

*Written Stage 8 / M5 (2026-07-30). Decision is Stephen's.*
