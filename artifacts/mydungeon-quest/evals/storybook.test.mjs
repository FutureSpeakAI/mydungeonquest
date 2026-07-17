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

// ---------------------------------------------------------------------------
// 11. PLAYED ORDER — chapters are contiguous stretches in the order the table
//     lived them; beat bookkeeping that jumps backward never reshuffles them.
// ---------------------------------------------------------------------------
{
  const camp = {
    id: 'camp-order', title: 'The Doubling Back', hero: { name: 'Wren', sigil: '✧' },
    codex: { spine: { beats: [{ title: 'Alpha Landing', act: 1 }, { title: 'Beta Bridge', act: 1 }] }, cast: [], regions: [], memoir: [] },
    chroniclePages: [],
    logs: [
      { id: 'o-0', beatIndex: 1, redacted: false, player: 'First lived moment.', dm: { narration_blocks: [{ text: 'ORDER-FIRST-PROSE', speaker: null }] }, resolution: null },
      { id: 'o-1', beatIndex: 0, redacted: false, player: 'Second lived moment.', dm: { narration_blocks: [{ text: 'ORDER-SECOND-PROSE', speaker: null }] }, resolution: null },
      { id: 'o-2', beatIndex: 1, redacted: false, player: 'Third lived moment.', dm: { narration_blocks: [{ text: 'ORDER-THIRD-PROSE', speaker: null }] }, resolution: null }
    ]
  };
  const html = buildStorybook({ campaign: camp, journal: [], media: [], reveals: [] });
  const at = (needle) => { const i = html.indexOf(needle); assert.ok(i >= 0, `${needle} must bind`); return i; };
  assert.ok(at('ORDER-FIRST-PROSE') < at('ORDER-SECOND-PROSE'), 'the first-lived turn reads first, whatever its beat number');
  assert.ok(at('ORDER-SECOND-PROSE') < at('ORDER-THIRD-PROSE'), 'the reading order is the played order, turn by turn');
  assert.ok(at('Beta Bridge') < at('Alpha Landing'), 'the opening chapter is the beat played FIRST, not the lowest beat index');
  assert.ok(html.split('Beta Bridge').length - 1 >= 2, 'a beat revisited later is its own stretch — never merged backward into the first');
  console.log('PASS storybook: chapters follow the played order, stretch by stretch');
}

// ---------------------------------------------------------------------------
// 12. THE SEEN LAW — only art the player actually saw binds; plates seat with
//     their own stretch; a plate first shown on a struck turn follows it out.
// ---------------------------------------------------------------------------
{
  const pxSeen = 'data:image/png;base64,iVBORw0KGgoAAAA=';
  const pxLost = 'data:image/png;base64,iVBORw0KGgoBBBB=';
  const pxStruck = 'data:image/png;base64,iVBORw0KGgoCCCC=';
  const pxCard = 'data:image/png;base64,iVBORw0KGgoDDDD=';
  const camp = {
    id: 'camp-seen', title: 'The Seen Tale', hero: { name: 'Wren', sigil: '✧' },
    codex: { spine: { beats: [{ title: 'One', act: 1 }, { title: 'Two', act: 2 }] }, cast: [], regions: [], memoir: [] },
    chroniclePages: [],
    logs: [
      { id: 's-0', beatIndex: 0, redacted: false, player: 'p0', dm: { narration_blocks: [{ text: 'n0', speaker: null }] }, resolution: null },
      { id: 's-1', beatIndex: 0, redacted: false, player: 'p1', dm: { narration_blocks: [{ text: 'n1', speaker: null }] }, resolution: null },
      { id: 's-2', beatIndex: 1, redacted: true, player: 'p2', dm: { narration_blocks: [{ text: 'n2', speaker: null }] }, resolution: null },
      { id: 's-3', beatIndex: 1, redacted: false, player: 'p3', dm: { narration_blocks: [{ text: 'n3', speaker: null }] }, resolution: null }
    ]
  };
  const rows = [
    { assetHash: 'seen-1', campaignId: 'camp-seen', kind: 'paint', label: 'scene one', createdAt: 1, dataUrl: pxSeen },
    { assetHash: 'never-shown', campaignId: 'camp-seen', kind: 'paint', label: 'lost take', createdAt: 2, dataUrl: pxLost },
    { assetHash: 'struck-plate', campaignId: 'camp-seen', kind: 'paint', label: 'struck scene', createdAt: 3, dataUrl: pxStruck },
    { assetHash: 'card-art', campaignId: 'camp-seen', kind: 'paint', label: 'beat cover', createdAt: 4, dataUrl: pxCard }
  ];
  const reveals = [
    { campaignId: 'camp-seen', kind: 'card', assetHash: 'card-art', ts: 50, context: { beatIndex: 1 } },
    { campaignId: 'camp-seen', kind: 'plate', assetHash: 'seen-1', ts: 100, context: { logId: 's-1' } },
    { campaignId: 'camp-seen', kind: 'plate', assetHash: 'struck-plate', ts: 200, context: { logId: 's-2' } }
  ];
  const html = buildStorybook({ campaign: camp, journal: [], media: rows, reveals });
  assert.ok(html.includes(pxSeen), 'a plate the player saw binds');
  assert.ok(!html.includes(pxLost), 'a take the player NEVER saw stays out of the whole book');
  assert.ok(!html.includes(pxStruck), 'a plate first shown on a struck turn follows its turn out of the book');
  assert.equal(html.split(pxSeen).length - 1, 2, 'the seen plate seats with its OWN stretch and the reel — no other chapter borrows it');
  assert.equal(html.split(pxCard).length - 1, 2, 'a cover dealt on a card seats with its own beat’s stretch, and rides the reel once');
  console.log('PASS storybook: the book binds only what was actually seen, seated where it was seen');
}

// ---------------------------------------------------------------------------
// 13. THE SHELF DOOR — art tagged for another adventure never binds, even if
//     a reveal mark vouches for it; the tale’s own art still does.
// ---------------------------------------------------------------------------
{
  const pxForeign = 'data:image/png;base64,iVBORw0KGgoFFFF=';
  const pxMine = 'data:image/png;base64,iVBORw0KGgoGGGG=';
  const camp = {
    id: 'camp-mine', title: 'My Own Tale', hero: { name: 'Wren', sigil: '✧' },
    codex: { spine: { beats: [{ title: 'Home', act: 1 }] }, cast: [], regions: [], memoir: [] },
    chroniclePages: [],
    logs: [{ id: 'm-0', beatIndex: 0, redacted: false, player: 'p0', dm: { narration_blocks: [{ text: 'n0', speaker: null }] }, resolution: null }]
  };
  const rows = [
    { assetHash: 'foreign-1', campaignId: 'someone-elses-tale', kind: 'paint', label: 'foreign scene', createdAt: 1, dataUrl: pxForeign },
    { assetHash: 'mine-1', campaignId: 'camp-mine', kind: 'paint', label: 'home scene', createdAt: 2, dataUrl: pxMine }
  ];
  const reveals = [
    { campaignId: 'camp-mine', kind: 'plate', assetHash: 'foreign-1', ts: 10, context: { logId: 'm-0' } },
    { campaignId: 'camp-mine', kind: 'plate', assetHash: 'mine-1', ts: 20, context: { logId: 'm-0' } }
  ];
  const html = buildStorybook({ campaign: camp, journal: [], media: rows, reveals });
  assert.ok(!html.includes(pxForeign), 'another adventure’s art is refused at the shelf door, reveal mark or no');
  assert.ok(html.includes(pxMine), 'the tale’s own seen art still binds');
  console.log('PASS storybook: the shelf door refuses art from other adventures');
}

// ---------------------------------------------------------------------------
// 14. THE ORIGINAL FACE — the hero leads the dramatis personae in the FIRST
//     forge bust, keyed by stable hash: a rename cannot orphan it, and a
//     newer retake under the old label never replaces it.
// ---------------------------------------------------------------------------
{
  const pxOriginal = 'data:image/png;base64,iVBORw0KGgoHHHH=';
  const pxRetake = 'data:image/png;base64,iVBORw0KGgoJJJJ=';
  const camp = {
    id: 'camp-face', title: 'The Renamed Hero', heroBustHash: 'face-original',
    hero: { name: 'Sorrel the Renamed', sigil: '✦' },
    codex: { spine: { beats: [{ title: 'Naming Day', act: 1 }] }, cast: [], regions: [], memoir: [] },
    chroniclePages: [],
    logs: [{ id: 'f-0', beatIndex: 0, redacted: false, player: 'p0', dm: { narration_blocks: [{ text: 'n0', speaker: null }] }, resolution: null }]
  };
  const rows = [
    { assetHash: 'face-original', campaignId: 'camp-face', kind: 'paint', variant: 'bust', label: 'Aria Vale portrait', createdAt: 1, dataUrl: pxOriginal },
    { assetHash: 'face-retake', campaignId: 'camp-face', kind: 'paint', variant: 'bust', label: 'Aria Vale portrait', createdAt: 99, dataUrl: pxRetake }
  ];
  const html = buildStorybook({ campaign: camp, journal: [], media: rows, reveals: [] });
  assert.ok(html.includes('Sorrel the Renamed'), 'the hero leads the dramatis personae under the CURRENT name');
  assert.equal(html.split(pxOriginal).length - 1, 2, 'the ORIGINAL bust binds exactly twice — the cover medallion and the hero plate — found by key, not by label');
  assert.ok(html.includes('cover-art'), 'the cover wears the hero medallion when a lawful face exists');
  assert.ok(!html.includes(pxRetake), 'a newer retake never replaces the original, and busts never ride the reel');
  console.log('PASS storybook: the hero wears the original face, rename or no');
}
