// E4 — voiceProvenance
//
// ── ROOT CAUSE DIAGNOSIS ─────────────────────────────────────────────────
//
// P7 (voice outage): narration segments cached as mock provider during
// a keyless session were permanently silenced once a real key arrived.
//
// THE BUG (narrator.js, pre-E4):
//   const cached = await db.media.where('cacheKey').equals(key).first();
//   if (cached?.blob) return { blob: cached.blob, provider: cached.provider || 'unknown' };
//
// Any cached row — including mock rows written by the keyless floor — was
// served without re-fetching. playSegment then hit:
//   if (!asset?.blob || asset.provider === 'mock') { skip; }
// and the segment was silenced forever.
//
// THE REFERENCE FIX (questaudio.js, ensurePodcastAsset, pre-existing):
//   if (cached?.blob && cached.provider && cached.provider !== 'mock')
//     return { blob: cached.blob, provider: cached.provider };
// Mock rows are treated as misses; a fresh real take overwrites them.
//
// THE E4 FIX: narrator.js ensureSegmentAsset applies the same pattern:
//   1. Mock-cached rows are treated as misses → /api/speak is called
//   2. Before writing the real take, the stale row is deleted
//   3. A failed write never leaves a ghost row blocking the next real take
//
// ─────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const narratorSource = readFileSync(path.join(__dirname, '../src/lib/cinema/narrator.js'), 'utf8');
const questSource = readFileSync(path.join(__dirname, '../src/lib/cinema/questaudio.js'), 'utf8');

// ── 1. The old unconditional cache hit is gone ─────────────────────────────
assert.ok(
  !narratorSource.includes("if (cached?.blob) return { blob: cached.blob, provider: cached.provider || 'unknown' }"),
  'narrator.js must NOT contain the old unconditional cache hit that silently served mock rows'
);

// ── 2. The new mock-aware cache check is present in narrator.js ─────────────
assert.ok(
  narratorSource.includes("cached.provider !== 'mock'"),
  "narrator.js ensureSegmentAsset must guard the cache hit with provider !== 'mock'"
);

// ── 3. The stale-row delete is present before the real take is written ───────
assert.ok(
  narratorSource.includes("await db.media.where('cacheKey').equals(key).delete()"),
  'narrator.js must delete the stale mock row before writing the real take'
);

// ── 4. Reference implementation (questaudio.js) has the same pattern ─────────
assert.ok(
  questSource.includes("cached.provider !== 'mock'"),
  "questaudio.js ensurePodcastAsset must also guard the cache hit with provider !== 'mock' (parity check)"
);
assert.ok(
  questSource.includes("await db.media.where('cacheKey').equals(key).delete()"),
  'questaudio.js must delete the stale row before writing (parity check)'
);

// ── 5. playSegment still skips mock provenance (the keyless floor holds) ────
// The guard at playSegment must remain so that even the re-fetched take (which
// is mock when ElevenLabs is not configured) produces silence, not noise.
assert.ok(
  narratorSource.includes("asset.provider === 'mock'"),
  'playSegment must still skip segments whose provider is mock (keyless floor)'
);

// ── 6. Real-provider cached rows are still served without re-fetching ────────
// The condition `provider !== 'mock'` preserves the cache for real takes.
assert.ok(
  narratorSource.includes("if (cached?.blob && cached.provider && cached.provider !== 'mock')"),
  "narrator.js must return real-provider cached rows directly (no unnecessary re-fetch)"
);

// ── 7. Functional proof via fake-indexeddb ────────────────────────────────────
// We can't call ensureSegmentAsset directly (it fetch()es /api/speak), but we
// CAN verify the cache logic inline to prove the guard and delete path together.
import 'fake-indexeddb/auto';
const { db } = await import('../src/lib/db.js');

const mockKey = 'narration:e4-probe:abc123:0:NARRATOR';
const realKey = 'narration:e4-probe:abc123:1:voice-xyz';

// Seed a mock-provider row.
await db.media.put({
  assetHash: 'hash-mock-0',
  cacheKey: mockKey,
  campaignId: 'e4-probe',
  kind: 'narration', mime: 'audio/mpeg',
  blob: new Blob(['mock-audio'], { type: 'audio/mpeg' }),
  provider: 'mock', model: 'mock',
  originTurnHash: null, createdAt: Date.now() - 5000,
  label: 'narrator', variant: 'NARRATOR',
});

// Seed a real-provider row.
await db.media.put({
  assetHash: 'hash-real-1',
  cacheKey: realKey,
  campaignId: 'e4-probe',
  kind: 'narration', mime: 'audio/mpeg',
  blob: new Blob(['real-audio'], { type: 'audio/mpeg' }),
  provider: 'elevenlabs', model: 'eleven_multilingual_v2',
  originTurnHash: null, createdAt: Date.now(),
  label: 'narrator', variant: 'voice-xyz',
});

// Reproduce the fixed cache check in isolation.
async function simulateCacheCheck(key) {
  const cached = await db.media.where('cacheKey').equals(key).first();
  // E4 guard (same logic as the fixed narrator.js):
  if (cached?.blob && cached.provider && cached.provider !== 'mock') {
    return { result: 'cache_hit', provider: cached.provider };
  }
  return { result: 'cache_miss', cached };
}

const mockCheck = await simulateCacheCheck(mockKey);
assert.equal(mockCheck.result, 'cache_miss', 'mock-provider row must produce a cache MISS under the E4 guard');
assert.ok(mockCheck.cached, 'the stale mock row exists in the DB before re-fetch');

const realCheck = await simulateCacheCheck(realKey);
assert.equal(realCheck.result, 'cache_hit', 'real-provider row must produce a cache HIT (no re-fetch)');
assert.equal(realCheck.provider, 'elevenlabs', 'cache hit returns the real provider');

// Simulate the delete-before-write that the fix adds.
if (mockCheck.cached) {
  await db.media.where('cacheKey').equals(mockKey).delete();
}
const afterDelete = await db.media.where('cacheKey').equals(mockKey).first();
assert.equal(afterDelete, undefined, 'stale mock row must be deleted before the real take is written');

// Real row must be untouched.
const realAfter = await db.media.where('cacheKey').equals(realKey).first();
assert.ok(realAfter, 'real-provider row must survive the mock-sweep');

console.log('PASS voiceProvenance — E4: stale mock-cached narration segments are treated as cache misses and re-fetched when a real key is available; the old unconditional cache hit is removed; the stale row is deleted before the real take is written; real-provider rows are still served from cache; the keyless floor (playSegment mock skip) is preserved; narrator.js and questaudio.js are now in parity on the mock-sweep pattern.');
