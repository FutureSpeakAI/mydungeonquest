# K5 — Crash Diagnosis (H0)

Produced by static code analysis of the campaign load path, chain verification,
and migration guard. A live device examination of the crashed campaign was not
possible; this classification is based on code structure and the known change
history across Stage C, E3, and E5.

---

## What the code confirms

**Database schema:** Dexie v2. Tables: `campaigns`, `journal`, `media`, `keys`,
`memories`, `settings`, `reveals` (v2 addition).

**Campaign load path** (`App.jsx`, `onOpen` handler, line ~1909):
1. Loads the campaign row from IndexedDB.
2. Applies identity migrations in a `G1 try/catch`:
   - `mediaTier` remapping (Stage C): `'cinema'` → `'illuminated'`
   - `castHeroVoice` (Stage C): injects `voiceId` for heroes missing it
   - `reconcileLegacyPurse` (Stage C): settles old gold/purse debt
3. Calls `setCurrent(campaign)` regardless of migration success/failure
   (fail-open guard: the player is never left on the title screen).

**Chain verification:** `verifyJournal` in `src/lib/vault.js`. Breaks at record N
when the hash chain does not verify. On break, the restore is refused and the
error is `"The vault's copy does not verify — the seal is broken at record ${broken.i}."`.

**E3 cache key scoping:** Bare SHA-256 keys were replaced by campaign-scoped
keys (`scenePlateKey`, `portrait:${campaignId}:...`). Old unscoped entries are
swept by `sweepUnscoped.js` during the shelf sync effect (H6).

**E5 narration bounds:** Validation-only (server-side). No data shape change.
No migration needed.

---

## Classification

**Most likely cause: shape drift from Stage C identity changes on campaigns saved
before the identity migrations were deployed.**

Evidence:
- The `onOpen` migration guard is fail-open (proceeds even if migration throws),
  meaning a crash can only happen AFTER the player is past the title screen —
  consistent with "crashed campaign" meaning the campaign loads but then fails
  during play.
- `reconcileLegacyPurse` and `castHeroVoice` both mutate the in-memory campaign
  object. If either throws on a malformed row, the campaign object may be in a
  partially-migrated state. Subsequent reducer calls will then fail on the
  unexpected shape.
- The reducer (`applyStoryUpdates` or the combat/deed reducers) does not guard
  against all legacy shapes; an un-migrated `mediaTier: 'cinema'` or a missing
  `voiceId` is not fatal, but a missing `purse` array or a malformed `cast` entry
  IS fatal to a reducer pass.

**Second most likely cause: quota exhaustion.**
`navigator.storage.estimate()` is not instrumented at crash time; if the origin
is near quota, IndexedDB writes silently fail after a certain point, and the
campaign's journal becomes truncated. Chain verification would then fail at the
first missing record.

**Third cause: chain break from pre-E3 media cache entries.**
Unscoped media entries left by pre-E3 pours could be served from the wrong
campaign's cache, causing a `logRefusal` from the belt-and-suspenders assertion
added in J1, but this would affect a plate, not the campaign itself.

---

## Decision: K7 (real migrations) is URGENT

The fail-open `onOpen` guard means old campaigns can be loaded in a
partially-migrated state that corrupts downstream reducer state. The only
durable fix is:
1. Write a real migration for each Stage C field (mediaTier, voiceId, purse).
2. Each migration records whether a default was applied.
3. The back-compat gate walks a save from before EACH Stage C change.

Quota diagnosis is secondary: the quota warning (added by H7) will surface this
proactively for future sessions.

---

## Diagnostic tool (for a live crashed campaign)

To classify a specific crashed campaign, run this in the browser console:

```js
const db = await Dexie.open('dungeon-quest');
const campaigns = await db.campaigns.toArray();
const campaign = campaigns[0]; // adjust index
console.log('exists:', Boolean(campaign));
const rows = await db.journal.where('campaignId').equals(campaign.id).toArray();
console.log('journal rows:', rows.length);
console.log('head hash matches last row:', campaign.headHash === rows[rows.length - 1]?.recordHash);
const est = await navigator.storage.estimate();
console.log('quota usage:', (est.usage / est.quota * 100).toFixed(1) + '%', est);
```

A chain verification failure will be reported by `verifyJournal(rows)` —
call it directly from the console if the vault module is reachable.
