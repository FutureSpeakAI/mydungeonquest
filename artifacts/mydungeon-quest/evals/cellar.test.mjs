// ---- THE CELLAR GATE (Directive XXII — Task 65, Phase 10) ----
//
// The cellar sweep, judged row by row over a fixture shelf whose seating is
// adversarial on purpose: the oldest rows on the shelf are treasures (the
// bust, the keyart), the newest are not automatically safe, and a plate the
// book cites sits exactly where a naive newest-first sweep would eat it.
// The courts:
//   · every immortal class kept under its NAMED immunity — the hero's
//     anchor bust, the composite sheet, the region's first plate (anchor),
//     house furniture, the book-attested plate, the standing region state,
//     the held frame (beyond the horizon, in its own sparse-tempo fixture),
//     the young scene, the unattributable row, the unreadable row;
//   · exactly the elder scene and the superseded region state evicted,
//     each naming its horizon;
//   · audio rows untouched whole (music, narration, sfx) — plates only;
//   · the plan deterministic and byte-stable, shuffled seating included,
//     and evicting NOTHING when the standing act is too young;
//   · the execution shrinking the shelf by exactly the plan, the journal
//     byte-identical before and after under the desk's own verification;
//   · the parchment shelf empty and unharmed;
//   · the honest cleared frame standing where the evicted plate once hung —
//     house words over the card's own procedural art, never a wrong image,
//     and the resolve walk minting nothing (no silent re-bill).
// Keyless, network-free: fake-indexeddb + react-test-renderer only.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

// Teach plain `node` to import the app's .jsx components.
register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Object URLs keyed on blob MIME type — survives the IndexedDB round-trip.
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const { sweepPlan, executeSweep, sweepStory, CELLAR_FRAME_LINE } = await import('../src/lib/cellar.js');
const { makeEnvelope, verifyJournal } = await import('fatescript/desk');
const CinematicModule = await import('../src/components/Cinematic.jsx');
const Cinematic = CinematicModule.default;
const { resolveAssets } = CinematicModule;
const { db } = await import('../src/lib/db.js');

const ok = (name) => console.log(`ok — ${name}`);

// Tree walkers (the mediaFallback pattern — findAllByType is brittle on host strings).
function collect(node, type, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collect(child, type, out); return out; }
  if (node.type === type) out.push(node);
  if (node.children) collect(node.children, type, out);
  return out;
}
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
};
const treeText = (tree) => textOf(tree);

// ---------------------------------------------------------------------------
// FIXTURE A — three acts sealed for real (the desk's own envelopes), the
// shelf seated adversarially. Standing act: 3.
// ---------------------------------------------------------------------------
const CAMP = 'cellar-fixture';
async function buildJournal(campaignId, script) {
  const rows = [];
  let prevHash = null, i = 0;
  for (const [type, payload] of script) {
    const row = await makeEnvelope({ type, i, prevHash, payload, ts: 1700000000000 + i * 1000 });
    rows.push({ ...row, campaignId });
    prevHash = row.recordHash; i += 1;
  }
  return rows;
}

const journalA = await buildJournal(CAMP, [
  ['turn', { n: 'act1 turn 1' }],                                    // i0 — t1
  ['turn', { n: 'act1 turn 2' }],                                    // i1 — t2 (the evicted scene's turn)
  ['turn', { n: 'act1 turn 3' }],                                    // i2 — t3
  ['annal', { annal: 'act one closed', actIndex: 0 }],               // i3 — fence
  ['epoch', { epoch: 'the first age', label: 'Act I', actIndex: 0 }],// i4 — twin fence, earliest rules
  ['turn', { n: 'act2 turn 1' }],                                    // i5 — t4
  ['epoch', { epoch: 'the second age', label: 'Act II', actIndex: 1 }], // i6 — act 2 closed by epoch ALONE (either fence suffices)
  ['turn', { n: 'act3 turn 1' }],                                    // i7 — t5
  ['turn', { n: 'act3 turn 2' }],                                    // i8 — t6
  ['chronicle_page', { prose: 'a page of the bound book', plates: ['plate-book-scene'] }] // i9 — the binding citation
]);
const T = (idx) => journalA[idx].recordHash;
const t1 = T(0), t2 = T(1), t3 = T(2), t4 = T(5), t5 = T(7);

// Each plate wears its OWN MIME subtype so the object-URL stub (keyed on
// blob.type) distinguishes plates at assetHash grain — a borrowed plate
// can never green a court by sharing 'image/png' with the lawful one.
const png = (tag) => new Blob([`PNG:${tag}`], { type: `image/x-${tag}` });
const mp3 = (tag) => new Blob([`MP3:${tag}`], { type: 'audio/mpeg' });

// Adversarial seating: the OLDEST rows are treasures; the plate the book
// cites is elder (a naive horizon-only sweep would eat it); the standing
// region state is itself elder (a naive age-only sweep would eat it too).
const mediaA = [
  { assetHash: 'plate-bust-aveline', cacheKey: 'bust:aveline', campaignId: CAMP, kind: 'paint', variant: 'bust', subtype: 'portrait', label: 'Aveline', originTurnHash: null, createdAt: 100, blob: png('bust') },
  { assetHash: 'plate-sheet-aveline', cacheKey: 'sheet:aveline', campaignId: CAMP, kind: 'paint', variant: 'sheet', subtype: 'portrait', label: 'Aveline', originTurnHash: t1, createdAt: 200, blob: png('sheet') },
  { assetHash: 'plate-keyart', cacheKey: 'keyart:cellar-fixture:act-1', campaignId: CAMP, kind: 'paint', subtype: 'keyart', label: null, originTurnHash: null, createdAt: 50, blob: png('keyart') },
  { assetHash: 'plate-book-scene', cacheKey: `scene:${CAMP}:${t1}`, campaignId: CAMP, kind: 'paint', subtype: 'scene', label: null, originTurnHash: t1, createdAt: 300, blob: png('book-scene') },
  { assetHash: 'plate-elder-scene', cacheKey: `scene:${CAMP}:${t2}`, campaignId: CAMP, kind: 'paint', subtype: 'scene', label: null, originTurnHash: t2, createdAt: 310, blob: png('elder-scene') },
  { assetHash: 'plate-unattributable', cacheKey: `scene:${CAMP}:orphan`, campaignId: CAMP, kind: 'paint', subtype: 'scene', label: null, originTurnHash: 'never-sealed-hash', createdAt: 320, blob: png('orphan') },
  { assetHash: 'plate-young-scene', cacheKey: `scene:${CAMP}:${t5}`, campaignId: CAMP, kind: 'paint', subtype: 'scene', label: null, originTurnHash: t5, createdAt: 500, blob: png('young') },
  { assetHash: 'plate-held-scene', cacheKey: `scene:${CAMP}:${t4}`, campaignId: CAMP, kind: 'paint', subtype: 'scene', label: null, originTurnHash: t4, createdAt: 600, blob: png('held') },
  { assetHash: 'plate-region-first', cacheKey: 'region:larkspur:1', campaignId: CAMP, kind: 'paint', subtype: 'region', label: 'Larkspur Vale', originTurnHash: t1, createdAt: 150, blob: png('region1') },
  { assetHash: 'plate-region-mid', cacheKey: 'region:larkspur:2', campaignId: CAMP, kind: 'paint', subtype: 'region', label: 'Larkspur Vale', originTurnHash: t3, createdAt: 250, blob: png('region2') },
  { assetHash: 'plate-region-standing', cacheKey: 'region:larkspur:3', campaignId: CAMP, kind: 'paint', subtype: 'region', label: 'Larkspur Vale', originTurnHash: t3, createdAt: 400, blob: png('region3') },
  { assetHash: 'audio-music', cacheKey: 'music:one', campaignId: CAMP, kind: 'music', label: null, originTurnHash: t3, createdAt: 120, blob: mp3('music') },
  { assetHash: 'audio-narration', cacheKey: 'narr:one', campaignId: CAMP, kind: 'narration', label: null, originTurnHash: t1, createdAt: 130, blob: mp3('narr') },
  { assetHash: 'audio-sfx', cacheKey: 'sfx:one', campaignId: CAMP, kind: 'sfx', label: null, originTurnHash: t2, createdAt: 140, blob: mp3('sfx') }
];

// ---------------------------------------------------------------------------
// Court 1 — the plan, row by row: every kept row names its immunity, the two
// lawful evictions name their horizons, nothing else burns.
// ---------------------------------------------------------------------------
const planA = sweepPlan({ media: mediaA, journal: journalA, currentAct: 3 });
const keptBy = new Map(planA.kept.map((row) => [row.assetHash, row.immunity]));
const evictedBy = new Map(planA.evicted.map((row) => [row.assetHash, row]));

const expectImmunity = (hash, prefix) => {
  assert.ok(keptBy.has(hash), `${hash} must be kept`);
  assert.ok(keptBy.get(hash).startsWith(prefix), `${hash} must be kept as ${prefix} (got: ${keptBy.get(hash)})`);
};
expectImmunity('plate-bust-aveline', 'anchor');
expectImmunity('plate-sheet-aveline', 'sheet');
expectImmunity('plate-keyart', 'house-furniture');
expectImmunity('plate-book-scene', 'book-attested');
expectImmunity('plate-region-first', 'anchor');
expectImmunity('plate-region-standing', 'standing-region');
expectImmunity('plate-held-scene', 'held-frame');
expectImmunity('plate-young-scene', 'young');
expectImmunity('plate-unattributable', 'unattributable');
expectImmunity('audio-music', 'audio-untouched');
expectImmunity('audio-narration', 'audio-untouched');
expectImmunity('audio-sfx', 'audio-untouched');
assert.equal(planA.counts.audio, 3, 'three audio rows counted untouched');

assert.deepEqual([...evictedBy.keys()].sort(), ['plate-elder-scene', 'plate-region-mid'], 'exactly the elder scene and the superseded region state burn');
assert.match(evictedBy.get('plate-elder-scene').horizon, /elder scene of act 1/, 'the scene eviction names its act');
assert.match(evictedBy.get('plate-region-mid').horizon, /superseded Larkspur Vale state of act 1/, 'the region eviction names its label and act');
assert.equal(planA.counts.held, 12, 'twelve rows held');
assert.equal(planA.counts.cleared, 2, 'two rows cleared');
for (const row of planA.kept) assert.ok(typeof row.immunity === 'string' && row.immunity.length > 0, 'every kept row names an immunity');
for (const row of planA.evicted) assert.match(row.horizon, /act \d/, 'every evicted row names its horizon');
ok('the plan keeps every treasure under its named immunity and burns only beyond the horizon');

// The unreadable row proves nothing and is never burned (plan-only: the
// shelf itself cannot even hold a row without its key).
const planUnreadable = sweepPlan({ media: [...mediaA, { campaignId: CAMP, kind: 'paint', blob: null }], journal: journalA, currentAct: 3 });
assert.ok(planUnreadable.kept.some((row) => row.immunity.startsWith('unreadable')), 'an unreadable row is kept, named');
assert.deepEqual(planUnreadable.evicted.map((r) => r.assetHash).sort(), ['plate-elder-scene', 'plate-region-mid'], 'the unreadable row disturbs no eviction');
ok('a row the law cannot read is kept fail-closed');

// ---------------------------------------------------------------------------
// Court 2 — determinism: byte-stable on repeat, byte-stable under shuffled
// seating (position can never impersonate the law), and a standing act too
// young evicts nothing at all.
// ---------------------------------------------------------------------------
const bytesA = JSON.stringify(planA);
assert.equal(JSON.stringify(sweepPlan({ media: mediaA, journal: journalA, currentAct: 3 })), bytesA, 'the plan is byte-stable on repeat');
const shuffled = [...mediaA].reverse();
[shuffled[0], shuffled[7]] = [shuffled[7], shuffled[0]];
assert.equal(JSON.stringify(sweepPlan({ media: shuffled, journal: journalA, currentAct: 3 })), bytesA, 'shuffled seating yields the identical plan, byte for byte');
assert.equal(sweepPlan({ media: mediaA, journal: journalA, currentAct: 1 }).evicted.length, 0, 'standing act 1: nothing is beyond the horizon');
assert.equal(sweepPlan({ media: mediaA, journal: journalA, currentAct: 2 }).evicted.length, 0, 'standing act 2: nothing is beyond the horizon');
ok('the plan is deterministic, seating-blind, and evicts nothing while the house is young');

// ---------------------------------------------------------------------------
// Court 3 — the held frame bites BEYOND the horizon: a sparse-tempo tale
// whose last painting fell in act 1 keeps that standing plate at act 3.
// ---------------------------------------------------------------------------
const CAMP_B = 'cellar-sparse';
const journalB = await buildJournal(CAMP_B, [
  ['turn', { n: 'sparse turn 1' }],                       // i0
  ['turn', { n: 'sparse turn 2' }],                       // i1
  ['annal', { annal: 'act one closed', actIndex: 0 }],    // i2
  ['annal', { annal: 'act two closed', actIndex: 1 }]     // i3
]);
const mediaB = [
  { assetHash: 'sparse-old-scene', cacheKey: `scene:${CAMP_B}:a`, campaignId: CAMP_B, kind: 'paint', subtype: 'scene', label: null, originTurnHash: journalB[0].recordHash, createdAt: 100, blob: png('sparse-old') },
  { assetHash: 'sparse-held-scene', cacheKey: `scene:${CAMP_B}:b`, campaignId: CAMP_B, kind: 'paint', subtype: 'scene', label: null, originTurnHash: journalB[1].recordHash, createdAt: 200, blob: png('sparse-held') }
];
const planB = sweepPlan({ media: mediaB, journal: journalB, currentAct: 3 });
assert.ok(planB.kept.some((row) => row.assetHash === 'sparse-held-scene' && row.immunity.startsWith('held-frame')), 'the sparse tale keeps its standing plate though it is elder');
assert.deepEqual(planB.evicted.map((r) => r.assetHash), ['sparse-old-scene'], 'only the plate behind the held frame burns');
ok('the tempo law\u2019s held frame stands immune beyond the horizon');

// ---------------------------------------------------------------------------
// Court 4 — the execution: the shelf shrinks by exactly the plan, the
// journal is byte-identical before and after, and the chain stands under
// the desk's own verification.
// ---------------------------------------------------------------------------
await db.media.clear(); await db.journal.clear();
await db.journal.bulkPut(journalA.map((row) => ({ ...row })));
await db.media.bulkPut(mediaA.map((row) => ({ ...row })));

const journalBefore = (await db.journal.where('campaignId').equals(CAMP).toArray()).sort((a, b) => a.i - b.i);
assert.ok((await verifyJournal(journalBefore)).every((verdict) => verdict.ok), 'the fixture chain verifies before the sweep');
const journalBeforeBytes = JSON.stringify(journalBefore);

await executeSweep(db, planA);

const remaining = (await db.media.where('campaignId').equals(CAMP).toArray()).map((row) => row.assetHash).sort();
const expectedRemaining = mediaA.map((row) => row.assetHash).filter((hash) => !evictedBy.has(hash)).sort();
assert.deepEqual(remaining, expectedRemaining, 'the shelf shrank by exactly the plan and nothing else');

const journalAfter = (await db.journal.where('campaignId').equals(CAMP).toArray()).sort((a, b) => a.i - b.i);
assert.equal(JSON.stringify(journalAfter), journalBeforeBytes, 'the journal is byte-identical after the sweep');
assert.ok((await verifyJournal(journalAfter)).every((verdict) => verdict.ok), 'the chain stands under the desk\u2019s own verification after the sweep');

const musicRow = await db.media.get('audio-music');
assert.ok(musicRow && musicRow.blob && musicRow.blob.size === mp3('music').size && musicRow.blob.type === 'audio/mpeg', 'the music row rests untouched, bytes and all');
assert.ok(await db.media.get('audio-narration'), 'the narration row rests untouched');
assert.ok(await db.media.get('audio-sfx'), 'the sfx row rests untouched');
ok('the execution walks the plan exactly: shelf shrunk, journal untouched, chain standing, audio whole');

// ---------------------------------------------------------------------------
// Court 5 — the parchment shelf: nothing stored, nothing swept, no error.
// ---------------------------------------------------------------------------
const CAMP_P = 'cellar-parchment';
const planP = sweepPlan({ media: [], journal: [], currentAct: 5 });
assert.deepEqual(planP.counts, { held: 0, cleared: 0, audio: 0, clearedBytes: 0 }, 'the parchment plan is empty');
await executeSweep(db, planP);
assert.equal(await db.media.where('campaignId').equals(CAMP_P).count(), 0, 'the parchment shelf stands empty and unharmed');
ok('parchment stores nothing and the sweep asks nothing of it');

// ---------------------------------------------------------------------------
// Court 6 — the honest cleared frame: the resolve walk finds the seat where
// the evicted plate hung, mints nothing (no silent re-bill), and the replay
// card speaks the house line over its own procedural art — never a wrong
// image. A surviving plate's replay shows the plate and no line.
// ---------------------------------------------------------------------------
const campaignA = {
  id: CAMP,
  codex: { beatIndex: 0, cast: [] },
  logs: [
    { id: 'log-t2', recordHash: t2, imageAssetHash: 'plate-elder-scene', imageUrl: 'data:image/png;base64,ELDER' },
    { id: 'log-t5', recordHash: t5, imageAssetHash: 'plate-young-scene', imageUrl: 'data:image/png;base64,YOUNG' }
  ]
};
const shelfCountBefore = await db.media.count();
const resolvedEvicted = await resolveAssets(campaignA, t2, 0, { replay: true });
assert.equal(resolvedEvicted.still, null, 'the evicted seat resolves no still — and borrows none');
assert.equal(resolvedEvicted.cleared, true, 'the resolve walk names the seat cleared');
assert.equal(await db.media.count(), shelfCountBefore, 'the resolve walk minted nothing: no silent re-bill');
const resolvedYoung = await resolveAssets(campaignA, t5, 0, { replay: true });
assert.equal(resolvedYoung.still?.assetHash, 'plate-young-scene', 'the surviving seat resolves its own plate, by hash');
assert.equal(resolvedYoung.cleared, false, 'a surviving seat is never called cleared');

const cinematicCard = { type: 'chapter_title', title: 'The Old Road', subtitle: 'Act I remembered.', palette: ['#0d0b14', '#4c465e', '#d4a24e'] };
let rootEvicted;
await act(async () => {
  rootEvicted = TestRenderer.create(h(Cinematic, { cinematic: cinematicCard, dialogue: null, campaign: campaignA, reduceMotion: false, turnRecordHash: t2, beatIndex: 0, replay: true, onClose: () => {} }));
});
await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
let tree = rootEvicted.toJSON();
assert.ok(treeText(tree).includes(CELLAR_FRAME_LINE), 'the cleared seat speaks the house line');
let imgs = collect(tree, 'img');
assert.equal(imgs.length, 1, 'the card shows exactly one backdrop');
assert.ok(String(imgs[0].props.src).startsWith('data:image'), 'the backdrop is the card\u2019s own procedural art — never a borrowed plate');
await act(async () => { rootEvicted.unmount(); });

let rootYoung;
await act(async () => {
  rootYoung = TestRenderer.create(h(Cinematic, { cinematic: cinematicCard, dialogue: null, campaign: campaignA, reduceMotion: false, turnRecordHash: t5, beatIndex: 0, replay: true, onClose: () => {} }));
});
await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
tree = rootYoung.toJSON();
assert.ok(!treeText(tree).includes(CELLAR_FRAME_LINE), 'a surviving plate\u2019s replay speaks no cleared line');
imgs = collect(tree, 'img');
assert.equal(imgs[0].props.src, 'blob:test/image/x-young', 'the surviving plate hangs as the backdrop — its own pixels, at assetHash grain');
await act(async () => { rootYoung.unmount(); });
ok('the honest frame stands where the evicted plate hung; a surviving plate hangs itself');

// ---------------------------------------------------------------------------
// Court 6½ — THE REPLAY IDENTITY LAW (the architect's conviction, cured
// red-first): a re-view resolves ONLY what that moment owned. A cleared
// seat outranks every substitute — nothing is borrowed over the honest
// frame though a beat cover hangs. The turn's own plate answers first;
// the BOUND beat's own cover second (the very art the card wore live,
// and the seen-bypass law's lawful rung); an UNBOUND re-view — identity
// dropped entirely — hangs nothing and claims nothing, because today's
// codex beat may never stand in for an elder moment. The living road
// keeps its fresh-plate ladder whole.
// ---------------------------------------------------------------------------
const { beatKeys } = await import('../src/lib/cinema/lookahead.js');
const keys0 = beatKeys(CAMP, 0);
await db.media.bulkPut([
  { assetHash: 'plate-beat-impostor', cacheKey: keys0.still, campaignId: CAMP, kind: 'paint', subtype: 'beat-still', label: null, originTurnHash: null, createdAt: 999, blob: new Blob(['PNG:impostor'], { type: 'image/x-impostor' }) },
  { assetHash: 'score-beat-impostor', cacheKey: keys0.score, campaignId: CAMP, kind: 'music', label: null, originTurnHash: null, createdAt: 999, blob: mp3('impostor-score') }
]);
const boundYoung = await resolveAssets(campaignA, t5, 0, { replay: true });
assert.equal(boundYoung.still?.assetHash, 'plate-young-scene', 'a re-view answers with the turn\u2019s OWN plate before any beat cover');
assert.equal(boundYoung.music?.assetHash, 'score-beat-impostor', 'the bound beat\u2019s own score replays — the very phrase the card wore live');
const boundEvicted = await resolveAssets(campaignA, t2, 0, { replay: true });
assert.equal(boundEvicted.still, null, 'the cleared seat borrows nothing though a beat cover hangs — the honest frame outranks every substitute');
assert.equal(boundEvicted.cleared, true, 'the cleared seat still speaks its claim');
const anon = await resolveAssets(campaignA, undefined, undefined, { replay: true });
assert.equal(anon.still, null, 'an unbound re-view hangs NOTHING — today\u2019s codex beat never stands in for an elder moment');
assert.equal(anon.cleared, false, 'an unbound re-view claims no clearing it cannot prove');
assert.equal(anon.music, null, 'an unbound re-view plays no borrowed score');
const live = await resolveAssets(campaignA, 'hash-owning-no-paint', 0, { replay: false });
assert.equal(live.still?.assetHash, 'plate-beat-impostor', 'the LIVING moment keeps its ladder: the beat\u2019s pre-briefed cover serves');
assert.equal(live.music?.assetHash, 'score-beat-impostor', 'the living score serves the living moment');

let rootAnon;
await act(async () => {
  rootAnon = TestRenderer.create(h(Cinematic, { cinematic: cinematicCard, dialogue: null, campaign: campaignA, reduceMotion: false, turnRecordHash: undefined, beatIndex: undefined, replay: true, onClose: () => {} }));
});
await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
tree = rootAnon.toJSON();
assert.ok(!treeText(tree).includes(CELLAR_FRAME_LINE), 'no identity, no claim — the cleared line stays unspoken');
imgs = collect(tree, 'img');
assert.equal(imgs.length, 1, 'the identity-less card shows exactly one backdrop');
assert.ok(String(imgs[0].props.src).startsWith('data:image'), 'no identity, no borrow — the card\u2019s own procedural art alone');
await act(async () => { rootAnon.unmount(); });
await db.media.bulkDelete(['plate-beat-impostor', 'score-beat-impostor']);
ok('the replay identity law holds: a re-view resolves only what the turn owned; the living road keeps its ladder');

// ---------------------------------------------------------------------------
// Court 7 — the spoken counts.
// ---------------------------------------------------------------------------
const story = sweepStory(planA.counts);
assert.ok(story.includes('12 held') && story.includes('2 old canvases cleared'), 'the story speaks the honest counts');
assert.ok(story.includes('3 audio rows rest untouched'), 'the story admits the audio rows rest untouched');
ok('the sweep speaks its counts in house words');

await db.media.clear(); await db.journal.clear();

console.log(`PASS cellar — the cellar sweep holds: ${planA.counts.held} held by named immunity, ${planA.counts.cleared} cleared beyond the horizon, audio untouched (${planA.counts.audio} rows), the shelf shrank by exactly the plan, the chain stands, and the honest frame speaks.`);
