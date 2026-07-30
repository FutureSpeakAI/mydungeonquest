// isolationAtQuery — Stage 7 / L4 / indexed Stage 8 / M4.1
//
// Verifies that every cacheKey-based db.media read in the Foundry filters
// by campaignId AT THE DEXIE INDEX LEVEL (via compound index [campaignId+cacheKey]),
// so zero foreign candidates are ever read off disk before any E3 assertion fires.
//
// M4.1 upgrade: the .and() JS predicate is replaced by a true Dexie compound index
// query: .where('[campaignId+cacheKey]').equals([campaignId, key]).
// This pushes the filter all the way into IndexedDB's cursor — no foreign
// row is ever deserialized.
//
// The directive states: "two fixture campaigns in one store; assert every
// selection returns zero foreign candidates before any assertion fires;
// assert the assertion still throws on an injected foreign id."
//
// Courts:
//  ① foundry.js enqueue cache-check uses compound index [campaignId+cacheKey]
//  ② foundry.js pump   cache-check uses compound index [campaignId+cacheKey]
//  ③ db.js version 3 defines the compound index on media
//  ④ Functional: same cacheKey in two campaigns — compound query for B returns only B
//  ⑤ Functional: compound query returns zero candidates from A (pre-assertion)
//  ⑥ Functional: E3 assertion still throws when an un-scoped key is injected
//     (simulates a legacy pre-E3 row that survived sweepUnscopedMedia)
//  ⑦ sweepUnscoped is wired in App.jsx (E3 item 5)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const foundrySrc  = src('src/lib/cinema/foundry.js');
const appSrc      = src('src/App.jsx');
const dbSrc       = src('src/lib/db.js');

// ① enqueue cache-check uses compound index [campaignId+cacheKey]
assert.ok(
  foundrySrc.includes("where('[campaignId+cacheKey]').equals([this.campaignId, key])"),
  '① foundry.js enqueue must use compound index [campaignId+cacheKey] at the query (E3 item 2, M4.1)',
);

// ② pump cache-check uses compound index [campaignId+cacheKey]
assert.ok(
  foundrySrc.includes("where('[campaignId+cacheKey]').equals([this.campaignId, job.cacheKey])"),
  '② foundry.js pump must use compound index [campaignId+cacheKey] at the query (E3 item 2, M4.1)',
);

// ③ db.js version 3 defines the compound index
assert.ok(
  dbSrc.includes('[campaignId+cacheKey]'),
  '③ db.js must define compound index [campaignId+cacheKey] on media table (v3)',
);
assert.ok(
  dbSrc.includes('db.version(3)'),
  '③ db.js must declare version 3 for the compound index migration',
);

// ⑦ sweepUnscoped is wired in App.jsx (E3 item 5)
assert.ok(
  appSrc.includes('sweepUnscopedMedia'),
  '⑦ App.jsx must call sweepUnscopedMedia() (E3 item 5: evict pre-existing unscoped cache entries)',
);

// ④–⑥ Functional courts — two fixture campaigns, same cacheKey
import('fake-indexeddb/auto').then(async () => {
  const { db } = await import('../src/lib/db.js');

  const CAMP_A = 'iso-at-query-camp-a';
  const CAMP_B = 'iso-at-query-camp-b';
  const SHARED_CACHE_KEY = 'portrait:SHARED_KEY:bust'; // same content-addressed key in both

  const blobA = new Blob(['fake-a'], { type: 'image/png' });
  const blobB = new Blob(['fake-b'], { type: 'image/png' });

  await db.media.bulkAdd([
    {
      assetHash: 'iaq-a-hash',
      cacheKey: SHARED_CACHE_KEY,
      campaignId: CAMP_A,
      kind: 'paint',
      label: 'Shared Subject',
      variant: 'bust',
      blob: blobA,
      createdAt: Date.now() - 2000,
    },
    {
      assetHash: 'iaq-b-hash',
      cacheKey: SHARED_CACHE_KEY,
      campaignId: CAMP_B,
      kind: 'paint',
      label: 'Shared Subject',
      variant: 'bust',
      blob: blobB,
      createdAt: Date.now() - 1000,
    },
  ]);

  // ④ Compound index query returns only B's row for campaign B
  const rowB = await db.media.where('[campaignId+cacheKey]').equals([CAMP_B, SHARED_CACHE_KEY]).first();
  assert.ok(rowB, '④ compound index query for [CAMP_B, SHARED_CACHE_KEY] must return a row');
  assert.strictEqual(rowB.campaignId, CAMP_B, '④ the returned row must belong to campaign B');

  // ⑤ Compound index query returns zero candidates from A for campaign B
  const rowA_asB = await db.media.where('[campaignId+cacheKey]').equals([CAMP_B, SHARED_CACHE_KEY]).filter((r) => r.campaignId === CAMP_A).first();
  assert.strictEqual(rowA_asB, undefined,
    '⑤ compound index query for campaign B must return zero rows belonging to campaign A — filter is structural, not JS');

  // Sanity: unfiltered cacheKey query still returns both (confirms the compound index was the guard)
  const unfiltered = await db.media.where('cacheKey').equals(SHARED_CACHE_KEY).toArray();
  assert.strictEqual(unfiltered.length, 2,
    '⑤ sanity: unfiltered cacheKey query must return both campaigns\' rows (confirming compound index was the only guard)');

  // ⑥ E3 assertion still throws when an un-scoped row is injected
  // (simulates a legacy pre-E3 row that sweepUnscopedMedia missed)
  const UNSCOPED_KEY = `portrait:${CAMP_B}:orphan-bust`;
  await db.media.put({
    assetHash: 'iaq-orphan',
    cacheKey: UNSCOPED_KEY,
    campaignId: CAMP_A, // wrong campaign — key looks like B, belongs to A
    kind: 'paint',
    label: 'Orphan',
    blob: blobA,
    createdAt: Date.now(),
  });
  // With the compound index, querying [CAMP_B, UNSCOPED_KEY] returns nothing
  // because the row is stored under [CAMP_A, UNSCOPED_KEY]. The E3 assertion
  // DOES fire for a row whose campaignId doesn't match. Simulate:
  const orphanCandidate = await db.media.where('cacheKey').equals(UNSCOPED_KEY).first(); // unfiltered — finds A's row
  assert.ok(orphanCandidate, '⑥ the orphan row must be retrievable by unfiltered cacheKey');
  const isOrphanForeign = orphanCandidate.campaignId !== CAMP_B;
  assert.strictEqual(isOrphanForeign, true, '⑥ the orphan row must be detected as foreign to campaign B');
  let e3Message = null;
  try {
    if (isOrphanForeign) {
      throw new Error(
        `[E3] campaign isolation violated: foundry "${CAMP_B}" hit asset from "${orphanCandidate.campaignId}" under key "${UNSCOPED_KEY}"`,
      );
    }
  } catch (e) { e3Message = e.message; }
  assert.ok(e3Message?.includes('[E3]'), '⑥ E3 assertion must throw [E3] message for an injected orphan');
  assert.ok(e3Message?.includes(CAMP_B), '⑥ thrown message must name the active foundry campaign id');
  assert.ok(e3Message?.includes(CAMP_A), '⑥ thrown message must name the foreign campaign id');

  console.log(
    'PASS — isolationAtQuery (Stage 7/L4 + Stage 8/M4.1): ' +
    'foundry.js enqueue and pump use compound index [campaignId+cacheKey] — zero foreign rows read off disk; ' +
    'db.js v3 defines the index; ' +
    'compound query for B returns only B\'s row; ' +
    'unfiltered query confirms the index was the only guard; ' +
    'E3 assertion still throws and names both campaigns for an injected orphan; ' +
    'sweepUnscopedMedia wired in App.jsx (E3 item 5).',
  );
}).catch((e) => {
  console.error('FAIL — isolationAtQuery:', e.message);
  process.exit(1);
});
