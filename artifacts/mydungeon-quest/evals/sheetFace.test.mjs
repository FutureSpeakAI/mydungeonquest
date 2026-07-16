// ------------------------------------------------------------
// THE SHEET-FACE GATE — Directive VI, Phase 12.
//
// The July 15 playtest: the hero's own face never reached the
// character sheet. The law under trial: the sheet wears the blessed
// anchor (post-Sitting) above all; else the stable hash key minted
// at the forge (rename-proof); else the elder-tale walk to the
// OLDEST bust under the hero's own label; else the parchment mark —
// a bust-shaped leaf, never a bare form. Faces come from the media
// store by its own key (assetHash), never re-rendered for the
// occasion.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSheetFace } from '../src/lib/sheetFace.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');
const blob = {}; // presence is the law; the resolver never reads bytes

const rows = [
  { assetHash: 'h-elder', kind: 'paint', variant: 'bust', label: 'Bram of the Vale — bust', createdAt: 10, blob },
  { assetHash: 'h-later', kind: 'paint', variant: 'bust', label: 'Bram of the Vale — bust, again', createdAt: 20, blob },
  { assetHash: 'h-forge', kind: 'paint', variant: 'bust', label: 'the forge take', createdAt: 30, blob },
  { assetHash: 'h-blessed', kind: 'paint', variant: 'bust', label: 'the sitting take', createdAt: 40, blob },
  { assetHash: 'h-plate', kind: 'paint', variant: 'scene', label: 'Bram of the Vale rides', createdAt: 5, blob },
];

// 1. The blessed anchor outranks all — even the stable key.
{
  const v = resolveSheetFace({ heroName: 'Bram of the Vale', blessedHash: 'h-blessed', anchorHash: 'h-forge', rows });
  assert.equal(v.source, 'blessed');
  assert.equal(v.hash, 'h-blessed', 'a face accepted at a Sitting is the face');
}

// 2. A blessing whose asset is gone falls through gracefully — the rung
//    finds nothing rather than inventing, and the stable key stands in.
{
  const v = resolveSheetFace({ heroName: 'Bram of the Vale', blessedHash: 'h-vanished', anchorHash: 'h-forge', rows });
  assert.equal(v.source, 'attested');
  assert.equal(v.hash, 'h-forge', 'the forge key holds when the blessing cannot be found');
}

// 3. No blessing: the stable hash key wins — rename-proof, label-blind.
{
  const v = resolveSheetFace({ heroName: 'Utterly Renamed', anchorHash: 'h-forge', rows });
  assert.equal(v.hash, 'h-forge', 'the minted key needs no label to agree');
}

// 4. Elder tales (no key): the OLDEST bust under the hero's own label —
//    never the latest take, and a scene plate is not a bust.
{
  const v = resolveSheetFace({ heroName: 'Bram of the Vale', rows });
  assert.equal(v.source, 'attested');
  assert.equal(v.hash, 'h-elder', 'the anchor law takes the first face, not the freshest');
}

// 5. No lawful face — renamed hero without a key borrows nothing; a
//    blob-less row is no face at all. The floor is parchment, and the
//    verdict says so in its own word.
{
  const renamed = resolveSheetFace({ heroName: 'Someone Else', rows });
  assert.equal(renamed.source, 'parchment');
  assert.equal(renamed.row, null, 'no borrowed portraits');
  const husk = resolveSheetFace({ heroName: 'Bram', rows: [{ assetHash: 'x', kind: 'paint', variant: 'bust', label: 'Bram', createdAt: 1 }] });
  assert.equal(husk.source, 'parchment', 'a row without bytes cannot be worn');
}

// 6. Determinism — the same rows read the same face twice.
{
  const a = resolveSheetFace({ heroName: 'Bram of the Vale', rows: [...rows].reverse() });
  const b = resolveSheetFace({ heroName: 'Bram of the Vale', rows });
  assert.equal(a.hash, b.hash, 'row order does not choose the face');
}

// 7. THE WIRING — the sheet seats an AnchorBust at its head, the bust
//    walks the resolver's ladder, and the parchment floor is a marked
//    leaf, never a bare span.
{
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes('function AnchorBust'), 'the AnchorBust stands in the overlays');
  assert.ok(overlays.includes('<AnchorBust campaign={campaign}/>'), 'the character sheet wears it at the head');
  assert.ok(overlays.includes('resolveSheetFace'), 'the bust walks the one ladder');
  assert.ok(overlays.includes('parchment-bust'), 'the floor is the parchment mark, not an empty form');
  const styles = read('src/styles.css');
  assert.ok(styles.includes('parchment-bust'), 'the parchment mark has its woodcut frame');
}

console.log('PASS — the sheet face: the blessed anchor outranks the forge key, the key outranks the label walk, elder tales take the oldest bust and never a borrowed or later face, byteless rows and strangers fall to a marked parchment floor, the choice is deterministic, and the sheet itself seats the AnchorBust.');
