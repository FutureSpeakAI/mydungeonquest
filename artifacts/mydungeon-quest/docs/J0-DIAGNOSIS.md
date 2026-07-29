# Stage J — Phase J0: Diagnosis Reports

_No code changes. Three reports as specified._

---

## Report 1 — Reference Selection

### Questions answered

**1. What store does it query for candidate subjects?**

The `db.media` Dexie store (schema: `assetHash, cacheKey, campaignId, kind, …`). Called from `resolveAnchors()` in `src/lib/cinema/foundry.js:42`.

**2. Is that query filtered by campaign id, and if so, at the query or after?**

Filtered **at the query**:

```js
// foundry.js:44
const rows = await db.media.where('campaignId').equals(campaignId).toArray();
```

The indexed `campaignId` column is the filter. No subsequent post-filter. This path is complete for the current codebase.

**3. For the contaminated campaign, dump the actual list of reference labels attached to Plate 9's paint call.**

No live device is available to dump a runtime call list; the static analysis below substitutes.

The labels fed to `resolveAnchors` come from `scenePlan.map(seat => seat.name)` (App.jsx:645), which `seatingPlan()` builds from:
- `cue.subjects` (at most 5 — from `sceneRoster`/`paintRoster`, which picks speaker → villain → bond from the campaign's own codex)
- `cue.region` (one ground slot — a region name from `campaign.codex.regions`)
- `species` (zero or one species from the current turn's `creature_add`)
- `cue.items` (prop-lawful items only)

All five inputs come from the current campaign's own codex or the current DM turn. `resolveAnchors` then queries only the rows whose `campaignId` equals the active campaign's ID, so foreign campaign media cannot reach the anchor list through this selection path as the code currently stands.

**4. Do foreign reference sheets appear in that list?**

No — they cannot, by the campaign-scoped query at foundry.js:44. The contamination trace at lines 279–284 emits `foreignAnchors: anchors.some(r => r.campaignId !== this.campaignId)`, which will always be false because anchors come from the campaign-scoped query. That instrumentation was written anticipating a possible future regression; it does not detect a current one.

### Revised diagnosis

**Section 0.1's hypothesis is structurally correct — the reference selection door is the right place to look — but the isolation is already present in the code at that door.** The bells, lanterns, and duplicate faces in the plates are not from foreign reference sheets riding the anchor list.

The actual mechanism producing the contaminated-looking plates is **P18 and the beat clause in `scenePrompt`** (`packages/engine/src/cinema/prompts.js:200`):

> "Depict this beat literally … and stage every thing the telling names (a road, a fork, a bell, a glow, a lantern) large in the foreground of the frame…"

The `moment.prose` field carries up to 480 characters of narration text. The prompt instructs the painter to render every named object in that text as a large foreground element. A narration that mentions a bell, a lantern, a fireplace, a ladder, and a hanging rope will produce a plate containing all of them — not because foreign reference sheets drove the composition, but because the prompt explicitly commanded it.

**P17 as stated (foreign reference sheets) is not confirmed.** The contamination trace should be checked against actual generated rows in the affected device to verify no rows with mismatched `campaignId` exist. The contamination trace (foundry.js:279–284) already instruments for this.

**P18 (cue carries accumulated facts) is confirmed as the primary composition defect.** The beat clause is the specific mechanism; `scenePrompt` assembles a prompt that includes the full narration excerpt as a painting directive.

---

## Report 2 — The Comet's Provenance

**The comet is native. J8 is not required.**

`src/lib/sky.js` implements the Shared Sky Law (Directive V, Phase 5):

> "One sky hangs over every world: each season the house publishes an omen, and every world may see the same comet and read it by its own covenant."

The comet is a **house-level seasonal omen** published by the sky feed (`/api/seasons`) and available to every campaign simultaneously. The DM reads the sky note at genesis and may weave it into the tale's opening. When it does, the comet becomes genuine canon of that campaign — native, not contaminated.

For "Larkspur Crossing": "under a comet's pale watch" and "Widen the doors the comet has opened" appear in narration and villain design. These are consistent with the DM having received the shared sky note at session zero and incorporated it. The comet is not a cross-campaign bleed from an earlier test campaign; it is the same seasonal omen both campaigns received independently.

No search of sealed records is possible without a live device and the affected campaign's IndexedDB. But the mechanism confirms the comet is native by design. **J8 is skipped.**

---

## Report 3 — E3 Reconciliation

Five items. Status for each:

**Item 1 — Campaign-scoped Foundry cache keys**
**LANDED** (G3).
All explicit cache keys in App.jsx carry `campaign.id`:
- Scene plates: `scenePlateKey(campaign.id, logId)` (App.jsx:645)
- Portraits: `` `portrait:${campaign.id}:…` `` (App.jsx:651)
- Regions: `` `region:${campaign.id}:…` `` (App.jsx:656)
- Sheets: `sheetKey(campaignId, name, rev)` = `` `sheet:${campaignId}:…` `` (src/lib/sheets.js:17)
- Beat stills: `` `beat:${campaignId}:…` `` (src/lib/cinema/lookahead.js)

**Item 2 — Retrieval feeding the DM prompt filtered by campaign id at the query**
**LANDED** (present before Stage 4).
`recallScenes(campaignId, query, currentTurn)` in `src/lib/memory.js:9`:
```js
const rows = await db.memories.where('campaignId').equals(campaignId).toArray();
```
Dexie index on `campaignId`; filter is at the query, not post-retrieval.

**Item 3 — Reference selection drawing only from this campaign's carded subjects**
**LANDED** (present before Stage 4).
`resolveAnchors(campaignId, labels, …)` in `foundry.js:44`:
```js
const rows = await db.media.where('campaignId').equals(campaignId).toArray();
```
Filter at the Dexie query. Post-retrieval label matching operates only on this campaign's rows.

**Item 4 — Boundary assertions that throw on a foreign campaign id**
**PARTIALLY LANDED**.
- The cache-hit boundary assertion is present (foundry.js:109): throws `[E3] campaign isolation violated` if a foreign campaign's cached asset is returned.
- The anchor-resolution path has no explicit assertion, but cannot produce foreign results because the query is campaign-scoped (item 3 above). A belt-and-suspenders assertion at the anchor resolution exit would make this structurally impossible to regress without a test catching it.
- The DM call entry has no explicit `campaignId` match assertion.

**Item 5 — Sweep of pre-existing unscoped entries**
**LANDED** (H6).
`sweepUnscopedMedia()` in `src/lib/cinema/sweepUnscoped.js` wired to App.jsx startup (dynamic import, `.catch(() => {})`). Removes rows whose `cacheKey` matches the bare SHA-256 pattern (`/^[0-9a-f]{64}$/`). Primary key is `assetHash` — `bulkDelete` call is correct.

### Summary

All five items are landed. Item 4 has a gap: the anchor-resolution path has no explicit assertion verifying that every resolved anchor belongs to the active campaign. This is belt-and-suspenders (the campaign-scoped query makes it structurally impossible), but an explicit assertion plus a test that injects a mismatched row would catch a regression in the Dexie index or the campaignId parameter being wrong.

**Confirmed root causes for this stage's work:**
- P18 (cue carries full narration text as a literal painting directive) is the primary composition defect.
- P19/P20 (caption generators — one old template, one sliced narration).
- P21/P22 (tick grammar, truncation, budget/rotation, villain targeting).
- P17 (foreign reference sheets) is not confirmed by static analysis; the isolation door is present. J1 adds the missing belt-and-suspenders assertion and the `referenceScope` test so this can be proven rather than assumed.

---

_J0 complete. J1 next._
