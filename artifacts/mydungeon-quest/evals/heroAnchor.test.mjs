// ---- The hero's original face ----
//
// Locks the STABLE FACE KEY law from "the storybook retells as actually seen":
//   1. The character sheet finds the hero's ORIGINAL forge bust by the stable
//      hash key on the campaign — renaming the hero cannot orphan it, and a
//      newer repaint under the same label never replaces the original.
//   2. An elder tale without the key falls back to the OLDEST bust under the
//      hero's label (the anchor law's own choice), never the latest take.
//   3. No key and no matching label (a renamed elder hero): the sheet stays
//      honest — the sigil, never someone else's face.
// Headless: node + fake-indexeddb + react-test-renderer, no AI keys.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The stub tells the two blobs apart by type — png is the original, jpeg the retake.
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const { db } = await import('../src/lib/db.js');
const { CharacterSheet } = await import('../src/components/Overlays.jsx');

const hero = (name) => ({
  name, sigil: '✦', level: 3, ancestry: 'Elf', className: 'Bard',
  hp: 10, maxHp: 12, ac: 13, gold: 4, xp: 120,
  abilities: { STR: 10, DEX: 14, CON: 11, INT: 12, WIS: 9, CHA: 15 },
  spellSlots: {}, conditions: [], inventory: ['a lute'], bearing: ''
});

const png = new Blob(['old-face'], { type: 'image/png' });
const jpeg = new Blob(['new-take'], { type: 'image/jpeg' });

const render = async (campaign) => {
  let tree;
  await act(async () => { tree = TestRenderer.create(h(CharacterSheet, { campaign, onClose: () => {}, onExport: () => {} })); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); }); // let the face effect settle
  return tree;
};
const faceOf = (tree) => {
  const img = tree.root.findAllByType('img').find((node) => String(node.props.className || '').includes('hero-face'));
  return img?.props?.src || null;
};

await db.media.clear();
await db.media.bulkAdd([
  { assetHash: 'hb-original', campaignId: 'c-anchor', kind: 'paint', variant: 'bust', label: 'Aria Vale portrait', createdAt: 1, blob: png },
  { assetHash: 'hb-retake', campaignId: 'c-anchor', kind: 'paint', variant: 'bust', label: 'Aria Vale portrait', createdAt: 99, blob: jpeg }
]);

// ---------------------------------------------------------------------------
// 1. The stable key beats both a rename and a newer take.
// ---------------------------------------------------------------------------
{
  const tree = await render({ id: 'c-anchor', heroBustHash: 'hb-original', hero: hero('Sorrel the Renamed') });
  assert.equal(faceOf(tree), 'blob:test/image/png', 'the stable key must find the ORIGINAL bust after a rename');
  await act(async () => tree.unmount());
  console.log('PASS heroAnchor: stable key survives a rename; the original beats the retake');
}

// ---------------------------------------------------------------------------
// 2. Elder tale (no key): the OLDEST bust under the label, never the latest.
// ---------------------------------------------------------------------------
{
  const tree = await render({ id: 'c-anchor', heroBustHash: null, hero: hero('Aria Vale') });
  assert.equal(faceOf(tree), 'blob:test/image/png', 'the elder fallback must pick the OLDEST bust for the label');
  await act(async () => tree.unmount());
  console.log('PASS heroAnchor: elder label fallback picks the oldest take');
}

// ---------------------------------------------------------------------------
// 3. No key, renamed elder hero: the sigil — never a borrowed face.
// ---------------------------------------------------------------------------
{
  const tree = await render({ id: 'c-anchor', heroBustHash: null, hero: hero('Utterly Different') });
  assert.equal(faceOf(tree), null, 'no key and no label match must fall to the sigil, not a guess');
  assert.ok(JSON.stringify(tree.toJSON()).includes('✦'), 'the sigil must stand in when no lawful face exists');
  await act(async () => tree.unmount());
  console.log('PASS heroAnchor: renamed elder tale stays honest with the sigil');
}

console.log('OK heroAnchor.test.mjs — the original face is anchored by key, not by name');

// ---------------------------------------------------------------------------
// 4. A LIVE UPDATE stays honest — swapping to a tale with no lawful face must
//    CLEAR the old portrait (sigil, never a stale ghost); a new key swaps faces.
// ---------------------------------------------------------------------------
{
  let tree;
  await act(async () => { tree = TestRenderer.create(h(CharacterSheet, { campaign: { id: 'c-anchor', heroBustHash: 'hb-original', hero: hero('Sorrel the Renamed') }, onClose: () => {}, onExport: () => {} })); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  assert.equal(faceOf(tree), 'blob:test/image/png', 'the first face binds before the swap');

  await act(async () => { tree.update(h(CharacterSheet, { campaign: { id: 'c-anchor', heroBustHash: null, hero: hero('Utterly Different') }, onClose: () => {}, onExport: () => {} })); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  assert.equal(faceOf(tree), null, 'no lawful face after the update — the stale portrait must clear');
  assert.ok(JSON.stringify(tree.toJSON()).includes('✦'), 'the sigil stands in after the swap');

  await act(async () => { tree.update(h(CharacterSheet, { campaign: { id: 'c-anchor', heroBustHash: 'hb-retake', hero: hero('Utterly Different') }, onClose: () => {}, onExport: () => {} })); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  assert.equal(faceOf(tree), 'blob:test/image/jpeg', 'a different key binds the different face');
  await act(async () => tree.unmount());
  console.log('PASS heroAnchor: live updates clear stale faces and swap lawfully');
}
