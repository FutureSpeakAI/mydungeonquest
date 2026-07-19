// ---- Media presentation assertions (films retired) ----
//
// Cinematic FILM generation was removed from the product: turns and chapter
// cards are painted stills only. But chronicles sealed before the retirement
// are immutable — their logs may still carry film-era fields (videoUrl,
// videoPosterUrl) and their media stores may hold 'video' rows. These
// render-level tests lock the compatibility contract:
//   1. A legacy film turn renders its painted keyframe poster as a normal
//      still plate — and NEVER mounts a <video> element.
//   2. The fullscreen Cinematic overlay ignores legacy 'video' rows and backs
//      the card with painted art.
//   3. A chapter card that fires before this turn's paint lands borrows the
//      campaign's latest painted scene (the flat gradient stays a last resort).
// They run headless — no AI keys, no browser — via react-test-renderer and
// fake-indexeddb.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

// Teach plain `node` to import the app's .jsx components (automatic JSX runtime).
register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
// Opt into React's act() testing environment so effect flushing is reliable.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// react-test-renderer never touches the DOM, but the components mint object
// URLs for their blobs. Stub the browser API and key the URL on the blob's MIME
// type — that survives the structured-clone round-trip through IndexedDB, so a
// blob read back from the store maps to the same URL.
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const { LogEntry } = await import('../src/App.jsx');
const Cinematic = (await import('../src/components/Cinematic.jsx')).default;
const { db } = await import('../src/lib/db.js');

const palette = ['#0d0b14', '#4c465e', '#d4a24e'];
const cinematic = { type: 'boss_reveal', title: 'The Drowned Choir', subtitle: 'It sings your name.', palette };

// Walk a rendered tree collecting every node of a given host type ('video',
// 'img', 'figcaption'). test-instance findAllByType throws on host strings in
// some builds, so we scan the JSON tree directly for robustness.
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

// ---------------------------------------------------------------------------
// 1. Legacy film turn in the story log: the sealed log still carries videoUrl
//    and the painted keyframe poster. The renderer must show the poster as a
//    normal still plate and must not mount a <video>.
// ---------------------------------------------------------------------------
{
  const log = {
    id: 'log-legacy-film',
    player: null,
    ts: Date.now(),
    dm: {
      narration_blocks: [{ text: 'The choir rises from the black water.', speaker: null }],
      cinematic
    },
    imageUrl: null,                                     // film turns had no scene plate
    videoUrl: 'blob:test/video/mp4',                    // legacy filmed cinematic
    videoPosterUrl: 'data:image/png;base64,POSTER',     // its painted keyframe
    videoDegraded: false
  };
  const campaign = { id: 'camp-legacy' };

  let root;
  await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, painting: false })); });

  const tree = root.toJSON();
  assert.equal(collect(tree, 'video').length, 0, 'legacy: a <video> must never mount now that films are retired');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'legacy: the keyframe poster must render as the still plate');
  assert.equal(imgs[0].props.src, log.videoPosterUrl, 'legacy: the plate must be the sealed painted poster, not a blank or procedural stand-in');
  const figs = collect(tree, 'figcaption');
  assert.ok(figs.some((f) => textOf(f).includes('illuminated')), 'legacy: the poster is painted art — caption it like any still');
  assert.ok(!figs.some((f) => textOf(f).includes('cinematic film')), 'legacy: the caption must not claim a film');

  await act(async () => { root.unmount(); });
  console.log('PASS — a legacy film turn renders its painted poster as a still plate (no <video>).');
}

// ---------------------------------------------------------------------------
// 2. Fullscreen Cinematic overlay with legacy media rows: a leftover 'video'
//    row for this turn must be ignored; the overlay backs the card with the
//    turn's painted still.
// ---------------------------------------------------------------------------
{
  const campaign = { id: 'camp-overlay', codex: { beatIndex: 0, cast: [] } };
  const turnRecordHash = 'turn-hash-overlay';
  const filmBlob = new Blob(['FILM_BYTES'], { type: 'video/mp4' });
  const stillBlob = new Blob(['STILL_BYTES'], { type: 'image/png' });

  await db.media.clear();
  await db.media.bulkPut([
    // Legacy row from the film era — must be ignored entirely.
    { assetHash: 'film-1', cacheKey: 'no-match-film', campaignId: campaign.id, kind: 'video', originTurnHash: turnRecordHash, createdAt: 2, blob: filmBlob },
    { assetHash: 'still-1', cacheKey: 'no-match-still', campaignId: campaign.id, kind: 'paint', originTurnHash: turnRecordHash, createdAt: 1, blob: stillBlob }
  ]);
  const stillUrl = URL.createObjectURL(stillBlob);

  let root;
  await act(async () => {
    root = TestRenderer.create(h(Cinematic, {
      cinematic, dialogue: null, campaign,
      reduceMotion: false, score: false, voiceOn: false,
      turnRecordHash, beatIndex: 0, onClose: () => {}
    }));
  });
  // Let the async asset resolution (IndexedDB read + setState) settle.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

  const tree = root.toJSON();
  assert.equal(collect(tree, 'video').length, 0, 'overlay: legacy video rows must not produce a <video>');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'overlay: the card must render exactly one still backdrop');
  assert.equal(imgs[0].props.src, stillUrl, 'overlay: the backdrop must be the painted still, not the legacy film or the gradient');

  await act(async () => { root.unmount(); });
  await db.media.clear();
  console.log('PASS — the Cinematic overlay ignores legacy video rows and shows the painted still.');
}

// ---------------------------------------------------------------------------
// 3. Fullscreen Cinematic overlay, chapter-card timing, under THE FRESH
//    PLATE LAW (XVII, Article III): the card fires the instant a turn
//    seals — BEFORE that turn's paint lands — and no code path may stand
//    a prior turn's plate in for the living moment. The overlay holds the
//    honest procedural gradient until THIS turn's own art exists; the
//    earlier scene on the shelf is NEVER borrowed. (Recut 2026-07-19,
//    Task 60B Stage One: this gate formerly pinned the 0.9-era borrow —
//    the exact seam the founder playtest convicted.)
// ---------------------------------------------------------------------------
{
  const campaign = { id: 'camp-early-card', codex: { beatIndex: 0, cast: [] } };
  const earlierPaint = new Blob(['EARLIER_SCENE'], { type: 'image/png' });

  await db.media.clear();
  await db.media.bulkPut([
    // The only art in the campaign: an EARLIER turn's painted scene. Its cache
    // key matches no beat key, and its origin hash is not this turn's hash.
    { assetHash: 'paint-early', cacheKey: 'scene:earlier-turn', campaignId: campaign.id, kind: 'paint', originTurnHash: 'an-earlier-turn', createdAt: 5, blob: earlierPaint }
  ]);
  const earlierUrl = URL.createObjectURL(earlierPaint);

  let root;
  await act(async () => {
    root = TestRenderer.create(h(Cinematic, {
      cinematic, dialogue: null, campaign,
      reduceMotion: false, score: false, voiceOn: false,
      turnRecordHash: 'this-turn-not-painted-yet', beatIndex: 0, onClose: () => {}
    }));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

  const tree = root.toJSON();
  assert.equal(collect(tree, 'video').length, 0, 'early card: no film exists anywhere anymore');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'early card: the overlay must render a still backdrop');
  assert.notEqual(imgs[0].props.src, earlierUrl, 'early card: a prior turn\u2019s plate NEVER stands in for the living moment (XVII, Article III)');
  assert.ok(String(imgs[0].props.src).startsWith('data:image/svg'), 'early card: the honest procedural gradient holds the frame until this turn\u2019s own art lands');

  await act(async () => { root.unmount(); });
  await db.media.clear();
  console.log('PASS — an early chapter card holds the honest gradient: no borrowed plate, ever.');
}

// ---------------------------------------------------------------------------
// 4. Legacy 'cinema' tier canonicalization at the data boundaries: a campaign
//    stored with the retired tier must export, import, and re-export as
//    'illuminated' — including the PERSISTED row, so IndexedDB cannot keep
//    re-leaking the old tier into exports forever.
// ---------------------------------------------------------------------------
{
  const { exportChronicle, importChronicle, canonicalTier } = await import('../src/lib/seal.js');
  assert.equal(canonicalTier('cinema'), 'illuminated', 'canonicalTier: cinema is retired');
  assert.equal(canonicalTier('parchment'), 'parchment', 'canonicalTier: live tiers pass through');
  assert.equal(canonicalTier('illuminated'), 'illuminated', 'canonicalTier: live tiers pass through');

  const legacyId = 'camp-legacy-cinema';
  await db.campaigns.put({ id: legacyId, title: 'The Old Cinema Save', mediaTier: 'cinema', spend: { images: 3, videos: 2, music: 1 }, turnCount: 0, headHash: null, createdAt: 1, updatedAt: 1 });

  const exported = await exportChronicle(legacyId);
  assert.equal(exported.campaign.mediaTier, 'illuminated', 'export: a legacy cinema row must serialize as illuminated');

  // Simulate restoring a chronicle file written by the OLD app (tier still cinema).
  const oldFile = { ...exported, campaign: { ...exported.campaign, mediaTier: 'cinema' } };
  const restored = await importChronicle(oldFile);
  assert.equal(restored.mediaTier, 'illuminated', 'import: the returned campaign must be coerced');
  const row = await db.campaigns.get(restored.id);
  assert.equal(row.mediaTier, 'illuminated', 'import: the persisted row must be coerced — no cinema left in IndexedDB');
  const reExported = await exportChronicle(restored.id);
  assert.equal(reExported.campaign.mediaTier, 'illuminated', 'round-trip: a re-export stays canonical');

  await db.campaigns.delete(legacyId);
  await db.campaigns.delete(restored.id);
  console.log('PASS — legacy cinema tier canonicalizes to illuminated across export/import/persistence.');
}

console.log('PASS — films are fully retired; legacy chronicles still show their painted art.');
