// THE STORYBOOK, PROVED (the Experience Cut, Phase 4) — the compiler binds
// sealed journal + Chronicler pages + painted plates into one illuminated
// book that is at once a page-turn reader, a print file, and a keepsake
// carrying its own proof. Keyless it binds raw text and procedural plates:
// the book always exists.
import assert from 'node:assert/strict';
import { buildStorybook } from '../src/lib/storybook.js';

const px = 'data:image/png;base64,iVBORw0KGgo=';

const campaign = {
  id: 'camp-book', title: 'The Fen Crossing', styleBible: 'measured, warm',
  covenant: 'No harm to the innocent.', completed: true,
  createdAt: 1719800000000, updatedAt: 1720900000000, sealedAt: 1720900000000,
  headHash: 'abc123head', signatureStatus: 'signed',
  hero: { name: 'Aria Vale', sigil: '✦' },
  codex: {
    beatIndex: 1,
    spine: { label: 'The Long Road', revealIdx: 1, beats: [{ title: 'Into the Fen', goal: 'Cross alive', act: 1 }, { title: 'The Far Shore', goal: 'Rest', act: 2 }] },
    arc: { title: 'The Fen Crossing', evil_plot: 'The water is patient.', style_bible: 'measured, warm' },
    cast: [
      { id: 'c1', name: 'Mara Vey', role: 'guide', visual: 'lantern-lit', status: 'dead', bond: 2, known_facts: ['Fell on turn 1 to the rising water.'], introduced_turn: 0 },
      { id: 'c2', name: 'Brother Loam', role: 'monk', visual: 'moss-robed', status: 'active', bond: 3, introduced_turn: 2, bond_arc: [{ why: 'You carried her warning.' }] }
    ],
    regions: [{ id: 'r1', name: 'The Gloaming Fen', state: 'drowning', visual: 'black water' }],
    memoir: ['The road began in rain.']
  },
  chroniclePages: [{
    title: 'The tale so far — Chapter I',
    passage: 'The fen swallowed the road behind you, and Mara Vey walked it with you while she could. "Keep to the stones, or the water keeps you," she said, and the warning outlived her.',
    cites: { from_turn: 0, to_turn: 1 }, mentions: ['Mara Vey'],
    quotes: [{ speaker: 'Mara Vey', line: 'Keep to the stones, or the water keeps you.', turn: 0 }],
    dice_moments: [{ turn: 1, total: 19, label: 'the leap for the far stone' }],
    beatIndex: 0, afterLogId: 'log-1', chapter: { index: 0, numeral: 'I', title: 'Into the Fen', act: 1 },
    provider: 'anthropic', raw: false, recordHash: 'page1hash'
  }],
  logs: [
    { id: 'log-0', beatIndex: 0, redacted: false, player: 'I follow the lantern.', dm: { narration_blocks: [{ text: 'The fen opens its black mouth.', speaker: null }], cinematic: { title: 'The Black Mouth' } }, resolution: null },
    { id: 'log-1', beatIndex: 0, redacted: false, player: 'I leap for the stone.', dm: { narration_blocks: [{ text: 'You land hard and alive.', speaker: null }] }, resolution: { total: 19 } },
    { id: 'log-2', beatIndex: 1, redacted: true, player: 'A scene set aside.', dm: { narration_blocks: [{ text: 'REDACTED-TEXT-NEVER-BOUND', speaker: null }] }, resolution: null },
    { id: 'log-3', beatIndex: 1, redacted: false, player: 'I rest at the shore.', dm: { narration_blocks: [{ text: 'The far shore is colder and truer.', speaker: 'Brother Loam' }] }, resolution: { total: 3 } }
  ]
};

const journal = [
  { type: 'turn', i: 0, prevHash: null, payload: { player: 'I follow the lantern.' }, ts: 1720000001000, recordHash: 'h0' },
  { type: 'turn', i: 1, prevHash: 'h0', payload: { player: 'I leap for the stone.' }, ts: 1720000002000, recordHash: 'h1' },
  { type: 'chronicle_page', i: 2, prevHash: 'h1', payload: { beatIndex: 0 }, ts: 1720000003000, recordHash: 'h2' },
  { type: 'sealing', i: 3, prevHash: 'h2', payload: { turns: 4 }, ts: 1720900000000, recordHash: 'abc123head' }
];

const media = [
  { kind: 'paint', label: 'keyart', variant: 'wide', dataUrl: px, assetHash: 'k1', createdAt: 1 },
  { kind: 'paint', label: 'Mara Vey', variant: 'bust', dataUrl: px, assetHash: 'b1', createdAt: 2 },
  { kind: 'paint', label: 'The Gloaming Fen', variant: 'wide', dataUrl: px, assetHash: 's1', createdAt: 3 }
];

// ---- 1. The illuminated binding: Chronicler page, cited and provenanced --
const html = buildStorybook({ campaign, journal, media });
assert.ok(html.includes('the warning outlived her'), 'the Chronicler passage is bound into its chapter');
assert.ok(html.includes('retold by the Chronicler · sealed as written'), 'provenance is printed honestly');
assert.ok(html.includes('turns 0–1'), 'every bound passage carries its citation');
assert.ok(html.includes('class="dropcap"'), 'the retelling opens with an illuminated drop cap');
assert.ok(html.includes('Here the die showed 19 — the leap for the far stone.'), 'dice ride in the margins with sealed totals');

// ---- 2. The honest floor inside the same book: a chapter with no page ----
assert.ok(html.includes('No Chronicler spoke for this chapter'), 'a pageless chapter says so');
assert.ok(html.includes('The far shore is colder and truer.'), '…and binds its raw sealed words');
assert.ok(html.includes('Here the die showed 3'), 'notable sealed rolls still reach the margin without a Chronicler');

// ---- 3. Redacted turns never reach the book ------------------------------
assert.ok(!html.includes('REDACTED-TEXT-NEVER-BOUND'), 'redacted content is never bound');
assert.ok(!html.includes('A scene set aside.'), 'not even the redacted player line');

// ---- 4. Entrances and fates ----------------------------------------------
assert.ok(html.includes('Mara Vey enters the tale'), 'chapter I margins mark the guide’s entrance');
assert.ok(html.includes('Brother Loam enters the tale'), 'an entrance inside a redacted position window is still marked (the window spans, the content stays out)');
assert.ok(html.includes('Fell on turn 1 to the rising water.'), 'the dramatis personae carry one-line fates');

// ---- 5. Every image is a data: URI (the binder’s law) --------------------
const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
assert.ok(srcs.length >= 3, 'plates were bound');
for (const src of srcs) assert.ok(src.startsWith('data:'), `non-data URI bound into the book: ${src.slice(0, 40)}`);
assert.ok(!html.includes('blob:'), 'no object URLs survive into the book');

// ---- 6. The embedded proof: verifier-format, chain intact ----------------
const proofMatch = html.match(/<script type="application\/json" id="chronicle-proof">([\s\S]*?)<\/script>/);
assert.ok(proofMatch, 'the keepsake carries its proof');
const proof = JSON.parse(proofMatch[1]);
assert.equal(proof.header.format, 'mydungeon.chronicle', 'the proof speaks the notary’s format');
assert.equal(proof.journal.length, 4, 'the whole chain rides along');
assert.equal(proof.header.headHash, 'abc123head');

// ---- 7. Three lives: reader, print, keepsake ------------------------------
assert.ok(html.includes('navigator.webdriver'), 'the reader stands down for the PDF binder');
assert.ok(html.includes('book-reader'), 'the page-turn reader is aboard');
assert.ok(html.includes('prefers-reduced-motion'), 'the motion law is honored');
assert.ok(html.includes('@media print'), 'print CSS is aboard');
assert.ok(html.includes('@page{size:Letter'), 'Letter is the default folio');
assert.ok(html.includes('Sealed, and true'), 'the final page bears the seal');
const a5 = buildStorybook({ campaign, journal, media, pageSize: 'A5' });
assert.ok(a5.includes('@page{size:A5'), 'the A5 folio binds on request');

// ---- 8. Keyless, pageless, artless: the book still exists ----------------
const bare = buildStorybook({
  campaign: { ...campaign, chroniclePages: [], completed: false, sealedAt: null, headHash: null, signatureStatus: 'hash-only' },
  journal: [], media: []
});
assert.ok(!bare.includes('<img'), 'no images means no img tags — never a broken plate');
assert.ok(bare.includes('procedural-plate'), 'chapters open on procedural plates');
assert.ok(bare.includes('stand as written'), 'every chapter binds its raw sealed words');
assert.ok(bare.includes('The fen opens its black mouth.'), '…and the words are really there');
assert.ok(bare.includes('unsealed'), 'the colophon is honest about an unsealed tale');
assert.ok(!bare.includes('undefined'), 'nothing unbound leaks into the page');

// ---- 9. The binder's door under attack -----------------------------------
// Imported chronicles control media rows; a crafted blob MIME can smuggle
// attribute breakouts into a data URL. The door refuses anything that is not
// a strict base64 image URI — the procedural plate stands in, the book holds.
const hostile = buildStorybook({
  campaign, journal,
  media: [
    ...media,
    { kind: 'paint', label: 'keyart', variant: 'wide', dataUrl: 'data:image/png" onerror="stolen();base64,AAAA', assetHash: 'x1', createdAt: 9 },
    { kind: 'paint', label: 'The Gloaming Fen', variant: 'wide', dataUrl: 'data:text/html;base64,PHNjcmlwdD4=', assetHash: 'x2', createdAt: 10 },
    { kind: 'paint', label: 'Mara Vey', variant: 'bust', dataUrl: 'blob:https://evil.example/x', assetHash: 'x3', createdAt: 11 }
  ]
});
assert.ok(!hostile.includes('onerror'), 'a crafted MIME breakout never reaches an attribute');
assert.ok(!hostile.includes('stolen'), 'nor does its payload');
assert.ok(!hostile.includes('data:text/html'), 'smuggled documents are refused at the door');
assert.ok(!hostile.includes('blob:'), 'object URLs are refused at the door');
assert.ok(hostile.includes(`url('${px}')`), 'the lawful keyart still binds the cover — refusal is surgical, not total');

// ---- 10. Journal law outranks the snapshot flag ---------------------------
// A turn struck by a sealed redaction event stays out of the book even when
// the campaign snapshot's own `redacted` flag went missing.
const divergentJournal = [
  { type: 'turn', i: 0, prevHash: null, payload: {}, ts: 1720000001000, recordHash: 'h0' },
  { type: 'turn', i: 1, prevHash: 'h0', payload: {}, ts: 1720000002000, recordHash: 'h1' },
  { type: 'turn', i: 2, prevHash: 'h1', payload: {}, ts: 1720000003000, recordHash: 'h2' },
  { type: 'turn', i: 3, prevHash: 'h2', payload: {}, ts: 1720000004000, recordHash: 'h3' },
  { type: 'redaction', i: 4, prevHash: 'h3', payload: { targetRecordHash: 'h3' }, ts: 1720000005000, recordHash: 'h4' }
];
const struck = buildStorybook({ campaign, journal: divergentJournal, media });
assert.ok(!struck.includes('The far shore is colder and truer.'), 'a journal-struck turn does not bind even unflagged');
assert.ok(!struck.includes('I rest at the shore.'), 'nor its player line');
assert.ok(!struck.includes('Here the die showed 3'), 'nor its die in the margin');
assert.ok(struck.includes('No Chronicler spoke for this chapter'), 'the emptied chapter still stands, honest about itself');
assert.ok(struck.includes('Brother Loam enters the tale'), 'entrances keep their window even when the words are struck');

console.log('PASS — the book always exists: illuminated when the Chronicler spoke, raw and honest when it did not, plates through the strict door only, journal law over snapshot flags, carrying its own proof for the notary.');
