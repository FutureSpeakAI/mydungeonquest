// ---- Degraded-media assertions: paid video players always keep a keyframe ----
//
// Cinema-tier players pay for a filmed cinematic. When the generated <video>
// cannot decode (unsupported codec, corrupt data, truncated download), the UI
// MUST swap the film for the painted keyframe still rather than showing a blank
// black box. These render-level tests fire the real onError handlers on both
// the inline story-log figure (LogEntry) and the fullscreen Cinematic overlay
// and assert the fallback still appears. They run headless — no AI keys, no
// browser — via react-test-renderer and fake-indexeddb.

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

// react-test-renderer never touches the DOM, but both components mint object
// URLs for their blobs. Stub the browser API and key the URL on the blob's MIME
// type — that survives the structured-clone round-trip through IndexedDB, so a
// blob read back from the store maps to the same URL, letting a test tell the
// film URL from the still URL after a swap.
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
// 1. Inline story-log figure (LogEntry): a playable <video> that errors falls
//    back to the painted keyframe still, and the figcaption stops claiming a
//    "cinematic film".
// ---------------------------------------------------------------------------
{
  const log = {
    id: 'log-inline',
    player: null,
    ts: Date.now(),
    dm: {
      narration_blocks: [{ text: 'The choir rises from the black water.', speaker: null }],
      cinematic
    },
    imageUrl: 'data:image/png;base64,SCENE_STILL', // the painted keyframe still
    videoUrl: 'blob:test/film.mp4',                // the filmed cinematic
    videoDegraded: false
  };
  const campaign = { id: 'camp-inline' };

  let root;
  await act(async () => { root = TestRenderer.create(h(LogEntry, { log, campaign, rendering: false })); });

  let tree = root.toJSON();
  const videos = collect(tree, 'video');
  assert.equal(videos.length, 1, 'inline: a playable film should render first for a cinema-tier turn');
  const figBefore = collect(tree, 'figcaption');
  assert.ok(figBefore.some((f) => textOf(f).includes('cinematic film')), 'inline: figcaption should read "cinematic film" before failure');
  assert.equal(collect(tree, 'img').length, 0, 'inline: no still image while the film is playing');

  // The codec dies — fire the real onError the component wired onto the <video>.
  await act(async () => { videos[0].props.onError(); });

  tree = root.toJSON();
  assert.equal(collect(tree, 'video').length, 0, 'inline: the failed film must be removed');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'inline: the keyframe still must render after failure');
  assert.equal(imgs[0].props.src, log.imageUrl, 'inline: the keyframe still must be the painted scene, not a blank box');
  const figAfter = collect(tree, 'figcaption');
  assert.ok(figAfter.some((f) => textOf(f).includes('keyframe')), 'inline: figcaption must read "keyframe" after failure');
  assert.ok(!figAfter.some((f) => textOf(f).includes('cinematic film')), 'inline: figcaption must stop claiming a "cinematic film"');

  await act(async () => { root.unmount(); });
  console.log('PASS — inline story-log film degrades to the painted keyframe (figcaption: "keyframe").');
}

// ---------------------------------------------------------------------------
// 2. Fullscreen Cinematic overlay: a film that errors falls back to the still.
//    The overlay resolves its assets from IndexedDB, so we seed a film blob and
//    a still blob for the turn, let the effect run, then fail the <video>.
// ---------------------------------------------------------------------------
{
  const campaign = { id: 'camp-overlay', codex: { beatIndex: 0, cast: [] } };
  const turnRecordHash = 'turn-hash-overlay';
  const filmBlob = new Blob(['FILM_BYTES'], { type: 'video/mp4' });
  const stillBlob = new Blob(['STILL_BYTES'], { type: 'image/png' });

  await db.media.clear();
  await db.media.bulkPut([
    { assetHash: 'film-1', cacheKey: 'no-match-film', campaignId: campaign.id, kind: 'video', originTurnHash: turnRecordHash, createdAt: 2, blob: filmBlob },
    { assetHash: 'still-1', cacheKey: 'no-match-still', campaignId: campaign.id, kind: 'paint', originTurnHash: turnRecordHash, createdAt: 1, blob: stillBlob }
  ]);
  const filmUrl = URL.createObjectURL(filmBlob);
  const stillUrl = URL.createObjectURL(stillBlob);
  assert.notEqual(filmUrl, stillUrl, 'sanity: film and still must resolve to distinct object URLs');

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

  let tree = root.toJSON();
  const videos = collect(tree, 'video');
  assert.equal(videos.length, 1, 'overlay: the resolved film should play first');
  assert.equal(videos[0].props.src, filmUrl, 'overlay: the playing film must be the generated clip');
  assert.equal(collect(tree, 'img').length, 0, 'overlay: no still while the film plays');

  // The clip fails to decode — fire the overlay's own onError fallback.
  await act(async () => { videos[0].props.onError(); });

  tree = root.toJSON();
  assert.equal(collect(tree, 'video').length, 0, 'overlay: the failed film must be removed');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'overlay: the still must render after the film fails');
  assert.equal(imgs[0].props.src, stillUrl, 'overlay: the fallback must show the painted still, not a blank box');

  await act(async () => { root.unmount(); });
  await db.media.clear();
  console.log('PASS — fullscreen Cinematic overlay degrades from film to the painted still on error.');
}

// ---------------------------------------------------------------------------
// 3. Fullscreen Cinematic overlay, chapter-card timing: the card fires the
//    instant a turn seals — BEFORE that turn's paint lands — so neither the
//    beat cache keys nor the origin-turn hash match any media row. The overlay
//    must borrow the campaign's most recent painted scene as its backdrop
//    rather than dropping to the flat procedural gradient.
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
  assert.equal(collect(tree, 'video').length, 0, 'early card: no film exists for this beat');
  const imgs = collect(tree, 'img');
  assert.equal(imgs.length, 1, 'early card: the overlay must render a still backdrop');
  assert.equal(imgs[0].props.src, earlierUrl, "early card: the backdrop must be the campaign's latest painted scene");
  assert.ok(!String(imgs[0].props.src).startsWith('data:'), 'early card: the flat procedural gradient must remain a last resort only');

  await act(async () => { root.unmount(); });
  await db.media.clear();
  console.log('PASS — an early chapter card borrows the latest painted scene (no flat gradient).');
}

console.log('PASS — degraded-media keyframe guarantee holds for both the inline log and the overlay.');
