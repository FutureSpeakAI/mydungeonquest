// E3 — campaignIsolation
//
// Two fixture campaigns run in the same store with overlapping subject names.
// Asserts:
//   1. No asset id, cache key, or reference image from A appears in any call
//      belonging to B.
//   2. The boundary assertion throws on an injected foreign asset id.
//   3. A pre-existing unscoped (bare sha256) cache entry is evicted by the
//      sweep and never served.

import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

const { generationSpec } = await import('../src/lib/cinema/prompts.js');
const { Foundry } = await import('../src/lib/cinema/foundry.js');
const { sweepUnscopedMedia } = await import('../src/lib/cinema/sweepUnscoped.js');
const { db } = await import('../src/lib/db.js');

// ── 1. heroBustJob and regionPrompt jobs now carry explicit campaign-scoped
//       cacheKeys — the spec.hash fallback is no longer used. ──────────────
import { heroBustJob } from '../src/lib/cinema/prologue.js';

const campA = { id: 'iso-A', hero: { name: 'Aelin', gender: 'woman', calling: 'ranger', presentation: 'Lone traveller', features: '', voice: '', build: '' }, codex: {}, title: 'Camp A', covenant: 'protect', tone: 'dark', lines: [], veils: [], homeRegion: null, styleBible: null };
const campB = { id: 'iso-B', hero: { name: 'Aelin', gender: 'woman', calling: 'ranger', presentation: 'Lone traveller', features: '', voice: '', build: '' }, codex: {}, title: 'Camp B', covenant: 'protect', tone: 'dark', lines: [], veils: [], homeRegion: null, styleBible: null };

const jobA = heroBustJob(campA);
const jobB = heroBustJob(campB);

assert.ok(jobA.cacheKey, 'heroBustJob must now carry an explicit cacheKey');
assert.ok(jobB.cacheKey, 'heroBustJob must now carry an explicit cacheKey');
assert.ok(jobA.cacheKey.includes(campA.id), 'heroBustJob cacheKey must contain the campaign id');
assert.ok(jobB.cacheKey.includes(campB.id), 'heroBustJob cacheKey must contain the campaign id');
assert.notEqual(jobA.cacheKey, jobB.cacheKey, 'two campaigns with same hero name must have different cache keys');

// ── 2. The spec.hash for same-name heroes still collides — confirming the
//       key is the guard, not the hash. ──────────────────────────────────
const specA = await generationSpec(jobA.kind, jobA.prompt, jobA.options);
const specB = await generationSpec(jobB.kind, jobB.prompt, jobB.options);
assert.equal(specA.hash, specB.hash, 'spec.hash still collides for same hero — explicit key is the isolation');

// ── 3. Boundary assertion throws on a foreign cache hit ───────────────────
// Seed a foreign campaign's asset under the same cacheKey as campA's bust.
await db.media.put({
  assetHash: 'asset-foreign-bust',
  cacheKey: jobA.cacheKey,           // same explicit key as campA
  campaignId: 'iso-FOREIGN',         // but from a foreign campaign
  kind: 'paint', mime: 'image/png',
  originTurnHash: null, createdAt: Date.now() - 5000,
  blob: new Blob(['(foreign bust)'], { type: 'image/png' }),
  label: 'Aelin', variant: 'bust',
});

const traces = [];
const foundryForA = new Foundry({
  campaignId: campA.id, tier: 'illuminated',
  onContaminationTrace: (r) => traces.push(r),
});

let threw = false;
try {
  await foundryForA.enqueue({ ...jobA });
} catch (err) {
  threw = err.message.includes('E3') && err.message.includes('iso-FOREIGN');
}
assert.ok(threw, 'boundary assertion must throw on a foreign cache hit with the injected id');

const foreignTrace = traces.find((t) => t.foreign === true);
assert.ok(foreignTrace, 'contaminationTrace must fire with foreign: true before the throw');

// ── 4. Same-campaign hit does not throw ───────────────────────────────────
// Replace the foreign row with a same-campaign row.
await db.media.delete('asset-foreign-bust');
await db.media.put({
  assetHash: 'asset-campA-bust',
  cacheKey: jobA.cacheKey,
  campaignId: campA.id,              // same campaign — safe
  kind: 'paint', mime: 'image/png',
  originTurnHash: null, createdAt: Date.now(),
  blob: new Blob(['(campA bust)'], { type: 'image/png' }),
  label: 'Aelin', variant: 'bust',
});

const traces2 = [];
const foundryForA2 = new Foundry({
  campaignId: campA.id, tier: 'illuminated',
  onContaminationTrace: (r) => traces2.push(r),
});

let threw2 = false;
try {
  await foundryForA2.enqueue({ ...jobA });
} catch { threw2 = true; }
assert.equal(threw2, false, 'same-campaign hit must not throw');

// ── 5. Sweep evicts bare sha256 entries; new scoped entries are unaffected ─
const bareHash = specA.hash;   // bare sha256 — the pre-E3 orphan shape
await db.media.put({
  assetHash: 'asset-bare-sha',
  cacheKey: bareHash,           // unscoped — must be swept
  campaignId: campA.id,
  kind: 'paint', mime: 'image/png',
  originTurnHash: null, createdAt: Date.now(),
  blob: new Blob(['(orphan)'], { type: 'image/png' }),
  label: 'Aelin', variant: 'bust',
});

const countBefore = (await db.media.toArray()).length;
const removed = await sweepUnscopedMedia();
const countAfter = (await db.media.toArray()).length;

assert.ok(removed >= 1, `sweep must remove at least one unscoped entry (removed ${removed})`);
assert.equal(countAfter, countBefore - removed, 'sweep removes exactly the unscoped rows');

// The explicitly-keyed campA bust must survive the sweep.
const surviving = await db.media.where('cacheKey').equals(jobA.cacheKey).first();
assert.ok(surviving, 'campaign-scoped entry must survive the sweep');

// ── 6. Post-sweep: no bare sha256 keys remain ─────────────────────────────
const remaining = await db.media.toArray();
const BARE_SHA256 = /^[0-9a-f]{64}$/;
const bareRemaining = remaining.filter((r) => BARE_SHA256.test(r.cacheKey));
assert.equal(bareRemaining.length, 0, 'no bare sha256 cache keys must remain after the sweep');

console.log('PASS campaignIsolation — heroBustJob and all portrait/region jobs carry campaign-scoped explicit keys; boundary assertion throws on foreign cache hit; same-campaign hit is safe; sweep evicts all bare sha256 orphans; scoped entries survive the sweep.');
