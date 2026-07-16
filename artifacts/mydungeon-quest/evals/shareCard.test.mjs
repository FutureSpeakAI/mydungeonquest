// ------------------------------------------------------------
// THE COMMONS GATE (game) — share cards & the public shelf's
// groundwork (Directive V, Commons Law).
//
// A sealed chapter may be shown, and showing has rules: the quote
// is verbatim from the sealed turn or absent, a struck row never
// leaves the table even when it holds the boldest deed, the plate
// walks only the strict door, a soul (or a world) named <script>
// renders inert, the file is named by the numeral alone, and a fork
// carries the covenant and the world's shape — never another
// patron's journal, never a hidden field. Zero keys, deterministic.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { renderShareCardHtml } = await import('fatescript/shareCard');
const { chapterEntries, chapterCard, cardPageHtml, cardFileName, forkSkeleton } = await import('../src/lib/shareCard.js');

const QUOTE = 'Stone gives way; the lantern gutters, and holds.';
const STRUCK_LINE = 'THE-SECRET-NO-ONE-MAY-QUOTE';
const CAMPAIGN = {
  id: 'tale-1',
  title: '<script>alert(1)</script> Vale',
  covenant: 'No harm to the innocent; the road is walked together.',
  codex: {
    arc: { title: 'The Ford' },
    spine: { beats: [{ title: 'The Crossing', act: 1 }, { title: 'The Deep', act: 1 }] },
    regions: [{ name: 'The Ford', description: 'A shallow crossing.', state: 'uneasy', secret: 'HIDDEN-WELL' }]
  },
  logs: [
    { id: 'r1', beatIndex: 0, resolution: { success: true, dc: 12 }, dm: { narration_blocks: [{ text: QUOTE }] } },
    { id: 'r2', beatIndex: 0, redacted: true, resolution: { success: true, dc: 20 }, dm: { narration_blocks: [{ text: STRUCK_LINE }] } },
    { id: 'r3', beatIndex: 0, kind: 'tick', resolution: { success: true, dc: 30 }, dm: { narration_blocks: [{ text: 'offscreen-tick' }] } },
    { id: 'r4', beatIndex: 1, resolution: { success: true, dc: 18 }, dm: { narration_blocks: [{ text: 'The deep answers.' }] } }
  ]
};

// 1. ONE CHAPTER, ONE BEAT — struck rows present in the slice (the law
//    wants them present, marked, and silent), the engine refuses them
//    a public word.
{
  const slice = chapterEntries(CAMPAIGN, 0);
  assert.deepEqual(slice.map((row) => row.id), ['r1', 'r2', 'r3'], 'the slice is the beat, whole');
  const card = chapterCard(CAMPAIGN, 0);
  assert.equal(card.quote, QUOTE, 'the quote is verbatim from the sealed turn, byte for byte');
  assert.ok(!JSON.stringify(card).includes(STRUCK_LINE), 'a struck row never leaves the table, even holding the boldest deed');
  assert.equal(card.chapterLabel, 'Chapter I \u2014 The Crossing');
  assert.equal(card.credit, 'Made with FateScript');
}

// 2. DETERMINISM — the same record composes the same card.
{
  assert.equal(JSON.stringify(chapterCard(CAMPAIGN, 0)), JSON.stringify(chapterCard(CAMPAIGN, 0)));
}

// 3. THE STRICT DOOR IN PUBLIC — only attested data plates walk.
{
  assert.equal(chapterCard(CAMPAIGN, 0, 'https://example.com/plate.png').plate, null, 'a fetched address is not an attested plate');
  assert.equal(chapterCard(CAMPAIGN, 0, 'data:image/png;base64,AAAA').plate, 'data:image/png;base64,AAAA');
}

// 4. A WORLD NAMED <script> WALKS THE SHELF INERT — at the fragment and
//    at the page shell alike.
{
  const card = chapterCard(CAMPAIGN, 0);
  const fragment = renderShareCardHtml(card);
  assert.ok(fragment.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'the record is shown as text');
  assert.ok(!fragment.includes('<script>alert'), 'and never as markup');
  const page = cardPageHtml(card);
  assert.ok(page.startsWith('<!doctype html>'));
  assert.ok(page.includes(fragment), 'the shell wraps the engine\u2019s own fragment');
  assert.ok(!page.includes('<script>alert'), 'the title crosses the escape too');
}

// 5. THE FILE IS NAMED BY THE NUMERAL ALONE — record strings never name
//    a file.
{
  assert.equal(cardFileName(0), 'share-card-chapter-i.html');
  assert.equal(cardFileName(3), 'share-card-chapter-iv.html');
  assert.ok(/^[a-z0-9.-]+$/.test(cardFileName(0)), 'whitelist-pure, end to end');
}

// 6. A FORK CARRIES THE COVENANT, NEVER THE JOURNAL — no logs, no cast,
//    no hidden field crosses; the credit seals into the child.
{
  const genesis = forkSkeleton(CAMPAIGN, 'https://shelf.example/tale-1');
  assert.equal(genesis.covenant, CAMPAIGN.covenant, 'the covenant travels');
  assert.deepEqual(genesis.regions[0], { name: 'The Ford', description: 'A shallow crossing.', state: 'uneasy' }, 'the world\u2019s shape travels, whole fields only');
  const bytes = JSON.stringify(genesis);
  assert.ok(!bytes.includes('HIDDEN-WELL'), 'a hidden field never crosses');
  assert.ok(!bytes.includes(QUOTE) && !bytes.includes(STRUCK_LINE), 'the journal does not travel');
  assert.ok(!('logs' in genesis) && !('cast' in genesis), 'no seat exists for another patron\u2019s journal');
  assert.equal(genesis.forkedFrom, 'https://shelf.example/tale-1', 'the credit seals into the child');
  assert.ok(genesis.note.includes('the journal does not'));
}

// 7. THE WIRING — the engine's commons under the lib, the public face at
//    the Codex, the plate drawn through the strict door.
{
  const lib = read('src/lib/shareCard.js');
  assert.ok(lib.includes('fatescript/shareCard'), 'the engine\u2019s commons is the only card law');
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes("from '../lib/shareCard.js'"), 'the Codex draws from the seat');
  assert.ok(overlays.includes('shareChapter('), 'a walked chapter offers its public face');
  assert.ok(overlays.includes('readAsDataURL'), 'the plate walks the strict door as data, never an address');
}

console.log('PASS \u2014 the commons gate (game): a chapter\u2019s public face quotes the sealed turn verbatim or not at all, a struck row never leaves the table even holding the boldest deed, only attested data plates walk the strict door, a world named <script> renders inert at fragment and shell alike, files are named by the numeral alone, and a fork carries covenant and world-shape with no seat for another patron\u2019s journal.');
