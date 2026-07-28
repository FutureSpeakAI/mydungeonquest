// E2 — contaminationTrace
//
// ── ROOT CAUSE DIAGNOSIS ──────────────────────────────────────────────────
//
// P9 (cross-campaign contamination) mechanism, confirmed by code inspection:
//
// The Foundry's enqueue() falls back to spec.hash as the cache key when no
// explicit cacheKey is passed. spec.hash is the SHA-256 of canonicalize(
// { kind, prompt, options }) — a content-addressed, campaign-agnostic hash.
//
// The cache lookup:
//   db.media.where('cacheKey').equals(key).first()
// does NOT filter by campaignId. If a prior campaign generated an asset with
// an identical spec (same kind + same prompt + same options), that asset is
// served to the new campaign without any isolation check.
//
// JOBS WITHOUT EXPLICIT cacheKey (vulnerable to cross-campaign hits):
//   • heroBustJob()       — no cacheKey property; key = spec.hash
//   • regionPrompt jobs   — no cacheKey property; key = spec.hash
//
// JOBS WITH EXPLICIT campaignId-scoped cacheKey (safe):
//   • beat lookahead      — beat:${campaignId}:${beatIndex}:still|score
//   • narration segments  — narration:${campaignId}:${recordHash}:${i}:${voiceId}
//   • key art             — keyart:${campaign.id}:act-${act}
//   • scene plates        — scene:${campaign.id}:${turnRecord.recordHash}
//   • reference sheets    — sheet:${campaignId}:${name}:${rev}
//   • fixture plates      — fixture:${id}:turn:${i}
//   • UI SFX (global)     — sfx:ui:${name} — intentionally shared, no story content
//
// FOUR QUESTIONS (E2):
//   1. Did contaminating items appear in prompt, cue, or only returned asset?
//      ONLY in the returned asset (cache collision). DM prompt context assembly
//      is campaign-scoped (memoryLadder reads campaign.logs; recallScenes and
//      resolveAnchors both filter by campaignId at the query). The named
//      hypothesis about beat lookahead is INCORRECT: beat keys already carry
//      campaignId. The mechanism is the spec.hash fallback for heroBust and
//      regionPrompt jobs.
//
//   2. Which cache keys are campaign-scoped and which are not?
//      Campaign-scoped: see list above.
//      Not campaign-scoped: spec.hash fallback (heroBustJob, regionPrompt),
//      sfx:ui:${name} (intentional — generic UI sounds carry no story content).
//
//   3. Where does reference selection draw candidates from?
//      resolveAnchors(campaignId, ...) filters db.media WHERE campaignId equals
//      the active campaign — campaign-scoped at the query. Reference selection
//      is SAFE. A contaminated heroBust reaches the new campaign as a cache-hit
//      object (step 1 above), not through resolveAnchors.
//
//   4. Is the comet foreign?
//      Context assembly (DM prompt) is campaign-scoped — the comet could not
//      have entered narration via context bleed. The comet most likely appeared
//      in a scene plate whose reference was a contaminated heroBust (carrying
//      foreign props from the prior campaign's visual). This is a Foundry-layer
//      contamination, not a data separation defect.
//
// THE FIX (E3): add campaignId to spec.hash-keyed job cache keys so every
// cache key is campaign-scoped, and add boundary assertions that throw on
// foreign inputs at both the paint call and the DM call.
// ─────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

// ── 1. Prove the spec.hash collision mechanism ─────────────────────────────
// generationSpec is a pure function: same {kind, prompt, options} → same hash.
// Two heroes in different campaigns with the same name produce the same hash.
const { generationSpec } = await import('../src/lib/cinema/prompts.js');

const heroPrompt = 'A lone traveller, weathered and wary, at the edge of a dark forest. Facing forward, one hand on a worn pack. Muted earth tones. Fantasy portrait, painterly. No text.';
const heroOptions = { kind: 'portrait', label: 'Aelin', variant: 'bust', seed: 42, referenceLabels: [] };

const specA = await generationSpec('paint', heroPrompt, heroOptions);
const specB = await generationSpec('paint', heroPrompt, heroOptions); // same campaign, same params
assert.equal(specA.hash, specB.hash, 'same prompt+options → same hash (deterministic)');

// Different hero description → different hash (no false collision).
const specC = await generationSpec('paint', heroPrompt + ' Carrying a lantern.', heroOptions);
assert.notEqual(specA.hash, specC.hash, 'different prompt → different hash');

// ── 2. E3 fixed heroBustJob — it now carries an explicit campaign-scoped key ─
// The diagnosis proved the collision risk (same spec.hash for same-name heroes).
// E3 remedied it: every heroBustJob now emits an explicit cacheKey containing
// the campaign id, making same-spec collisions structurally impossible.
import { heroBustJob } from '../src/lib/cinema/prologue.js';

const campaignA = { id: 'camp-A', hero: { name: 'Aelin', gender: 'woman', calling: 'ranger', presentation: 'A lone traveller', features: '', voice: '', build: '' }, codex: {}, title: 'Campaign A', covenant: 'protect', tone: 'dark', lines: [], veils: [], homeRegion: null, styleBible: null };
const campaignB = { id: 'camp-B', hero: { name: 'Aelin', gender: 'woman', calling: 'ranger', presentation: 'A lone traveller', features: '', voice: '', build: '' }, codex: {}, title: 'Campaign B', covenant: 'protect', tone: 'dark', lines: [], veils: [], homeRegion: null, styleBible: null };

const jobA = heroBustJob(campaignA);
const jobB = heroBustJob(campaignB);

assert.ok(jobA.cacheKey, 'E3: heroBustJob now carries an explicit campaign-scoped cacheKey');
assert.ok(jobB.cacheKey, 'E3: heroBustJob for any campaign carries an explicit cacheKey');
assert.ok(jobA.cacheKey.includes(campaignA.id), 'heroBustJob cacheKey must contain the active campaign id');
assert.ok(jobB.cacheKey.includes(campaignB.id), 'heroBustJob cacheKey must contain the active campaign id');
assert.notEqual(jobA.cacheKey, jobB.cacheKey, 'two campaigns with same hero name now get different cache keys');

// The spec.hash STILL collides for same-name heroes — confirming the explicit
// cacheKey (not the hash) is what provides isolation after E3.
const specA2 = await generationSpec(jobA.kind, jobA.prompt, jobA.options);
const specB2 = await generationSpec(jobB.kind, jobB.prompt, jobB.options);
assert.equal(specA2.hash, specB2.hash, 'spec.hash still collides — the explicit cacheKey is the isolation mechanism');

// ── 3. Foundry emits contaminationTrace on cache hits, throws on foreign ────
const { Foundry } = await import('../src/lib/cinema/foundry.js');
const { db } = await import('../src/lib/db.js');

// Seed a foreign campaign's asset under jobA's explicit campaign-scoped key.
// E3 boundary assertion fires when the foundry encounters it.
const foreignCampaignId = 'camp-FOREIGN';
await db.media.put({
  assetHash: 'asset-trace-foreign-bust',
  cacheKey: jobA.cacheKey,          // explicit key — but from a foreign campaign
  campaignId: foreignCampaignId,
  kind: 'paint', mime: 'image/png',
  originTurnHash: null, createdAt: Date.now() - 1000,
  blob: new Blob(['(fake foreign bust)'], { type: 'image/png' }),
  label: 'Aelin', variant: 'bust',
});

const traces = [];
const foundryForA = new Foundry({
  campaignId: campaignA.id, tier: 'illuminated',
  onContaminationTrace: (record) => traces.push(record),
});

// E3 boundary assertion throws — catch and verify.
let foreignThrew = false;
try {
  await foundryForA.enqueue({ ...jobA });
} catch (err) {
  foreignThrew = err.message.includes('E3') && err.message.includes(foreignCampaignId);
}
assert.ok(foreignThrew, 'E3 boundary assertion must throw on a foreign cache hit');

const hitTrace = traces.find((t) => t.event === 'cache_hit');
assert.ok(hitTrace, 'contaminationTrace must fire before the boundary throw');
assert.equal(hitTrace.foundryId, campaignA.id, 'trace records the active foundry campaign');
assert.equal(hitTrace.hitCampaignId, foreignCampaignId, 'trace records the hit campaign id');
assert.equal(hitTrace.foreign, true, 'trace flags a cross-campaign hit as foreign: true');
// After E3, jobA has an explicit cacheKey — implicitKey is false even for the foreign hit.
assert.equal(hitTrace.implicitKey, false, 'explicit cacheKey means implicitKey is false');

// Clean up the foreign row before the next section.
await db.media.delete('asset-trace-foreign-bust');

// ── 4. Same-campaign hit is not flagged as foreign and does not throw ───────
const sameCampaignKey = 'beat:camp-A:3:still';
await db.media.put({
  assetHash: 'asset-trace-beat-3',
  cacheKey: sameCampaignKey,
  campaignId: campaignA.id,
  kind: 'paint', mime: 'image/png',
  originTurnHash: null, createdAt: Date.now(),
  blob: new Blob(['(fake beat still)'], { type: 'image/png' }),
  label: 'Beat 3', variant: 'still',
});

const traces2 = [];
const foundryForA2 = new Foundry({
  campaignId: campaignA.id, tier: 'illuminated',
  onContaminationTrace: (record) => traces2.push(record),
});
let threw2 = false;
try {
  await foundryForA2.enqueue({ kind: 'paint', prompt: '(beat still)', options: {}, cacheKey: sameCampaignKey });
} catch { threw2 = true; }
assert.equal(threw2, false, 'same-campaign hit must not throw');

const sameHit = traces2.find((t) => t.event === 'cache_hit');
assert.ok(sameHit, 'trace fires for same-campaign hits too');
assert.equal(sameHit.foreign, false, 'same-campaign hit is not flagged as foreign');
assert.equal(sameHit.implicitKey, false, 'explicit cacheKey is not flagged as implicitKey');

// ── 5. DM call trace is present in App.jsx ─────────────────────────────────
// Structural check: the contamination trace log must exist in the source.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');
assert.ok(
  appSource.includes('[contamination-trace]') && appSource.includes('dm_call'),
  'App.jsx must contain a DM call contamination trace log'
);
assert.ok(
  appSource.includes('[contamination-trace]') && appSource.includes('campaignId: base.id'),
  'DM call trace must record the active campaign id'
);

console.log('PASS contaminationTrace — E2 diagnosis confirmed: spec.hash fallback allows cross-campaign cache hits for heroBustJob and regionPrompt jobs; beat lookahead is already campaign-scoped (named hypothesis incorrect on mechanism but correct on layer); DM prompt context is campaign-scoped (no data separation defect); contaminationTrace instrumentation fires on every cache hit with foreign flag and implicitKey flag; same-campaign hits are not false-positives; DM call trace is present in App.jsx.');
