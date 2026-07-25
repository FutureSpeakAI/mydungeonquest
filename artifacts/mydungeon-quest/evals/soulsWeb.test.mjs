// ---- THE WEB OF SOULS SEATING (Directive XX, Article Five, Law XIV) ----
//
// The table-side court over the drawn web, twinned with the engine's
// soulsWeb gate (which judges the pure fraction on the same fixture
// tale):
//   1. THE SHELF: the surface rides the Book's OWN lazy chunk — no
//      manifest row of its own (the Chart's precedent), no new
//      synchronous entry, the built Book chunk carrying the web's
//      words, and the entry's closure UNMOVED at its exact bytes,
//      pinned to the measured build of the morning the web was seated.
//      Cross-pointed with the lean door's kB pin; both courts read the
//      ONE closure walk in manifestClosure.mjs.
//   2. THE SEAT: the surface asks the wiki's OWN reveals seat
//      (introducedNames) and hands the answer to the engine builder —
//      a private reading of the canon is a red, by the alias lesson's
//      sibling law; the Seen Ledger (art reveals) is never consulted.
//   3. THE RENDER: house words — bound by blood, sworn enemies — never
//      machinery; the dead rest marked; the unmet absent from every
//      rendered byte; a soul opens toward their page in the Book's
//      manner, by tap and by key.
//   4. THE ELDER SAVE: a pre-web record, deep-frozen, renders its web
//      lawfully from whatever it holds — the grandfather bench seats,
//      canon without record stays absence, loading writes nothing.
// Headless — no AI keys, no browser — react-test-renderer + esbuild
// loader + fake-indexeddb. Convicted red at birth (standing law):
// (α) a private reading planted in the surface — the source court
// refused it; (β) the surface seated on the entry's synchronous road —
// the closure court refused the moved bytes.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire, register } from 'node:module';
import { entryClosureOf, closureBytesOf } from './manifestClosure.mjs';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

// The web is a reading: nothing in it may reach for the wire.
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: false, blob: async () => new Blob([], { type: 'application/octet-stream' }), headers: { get: () => null } };
};

const GAME_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(GAME_ROOT, 'dist');

// THE EXACT-BYTES PIN: the entry's synchronous closure, measured
// 2026-07-25. Before the web was seated the closure weighed 635164
// bytes; seating it moved the sum to 635173 — NINE bytes, examined
// before they were ruled lawful: the entry's export tail grew because
// it now LENDS its own engine folds to the Book's chunk (the walk law
// the web draws already rides sync for turn validation; rollup shares
// the one copy rather than minting a second into the lazy shelf). The
// entry file was proven clean of every web string — the surface, its
// words, and the builder live in the Book's chunk alone. Nine bytes of
// lending glue beats a duplicated law by thousands, so the pin seats
// at the measured 635173 and binds EXACTLY: any future move — even one
// byte — is argued to the owner at the lean door's movement ledger and
// re-seats this pin in the SAME ruling.
const CLOSURE_BYTES_PIN = 635173;

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};
function collectWhere(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectWhere(child, pred, out); return out; }
  if (node.props && pred(node)) out.push(node);
  if (node.children) collectWhere(node.children, pred, out);
  return out;
}
const collectByClass = (node, token) => collectWhere(node, (n) => String(n.props?.className || '').split(/\s+/).includes(token));
const textOf = (node) => node == null || typeof node === 'boolean' ? ''
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('')
  : textOf(node.children);

// ---- Court 1 — THE SEAT: the source itself asks the wiki's own reveals seat ----
const surfaceSrc = readFileSync(path.join(GAME_ROOT, 'src/components/SoulsWeb.jsx'), 'utf8');
assert.match(surfaceSrc, /introducedNames\(/, 'the surface asks the wiki\u2019s own reveals seat');
assert.match(surfaceSrc, /from '\.\.\/lib\/unmet\.js'/, 'the seat is the unmet law\u2019s own fold, imported from its one home');
assert.match(surfaceSrc, /buildSoulsWeb\(/, 'the web is the engine\u2019s pure fold, drawn — never re-derived here');
assert.match(surfaceSrc, /from 'fatescript\/soulsWeb'/, 'the builder rides the one road from the engine');
assert.doesNotMatch(surfaceSrc, /codex\s*\??\.\s*cast/, 'a private reading of the canon is a red — no surface grows its own reveals resolver');
assert.doesNotMatch(surfaceSrc, /isIntroduced/, 'the introduction law is asked, never re-derived');
assert.doesNotMatch(surfaceSrc, /\/db\.js|listReveals|revealSet/, 'no vault read, and the Seen Ledger (art reveals) is not the story seat');
const bookSrc = readFileSync(path.join(GAME_ROOT, 'src/components/Book.jsx'), 'utf8');
assert.match(bookSrc, /import SoulsWeb from '\.\/SoulsWeb\.jsx'/, 'the web rides the Book\u2019s chunk by a static import from the Book itself');
assert.match(bookSrc, /<h3>The web of souls<\/h3>/, 'the Book hangs the web under its own heading, in house words');
assert.match(bookSrc, /<SoulsWeb campaign=\{campaign\} onNav=\{onNav\} statusWord=\{STATUS_WORD\} \/>/, 'the Book seats the web on the People page with the house\u2019s own status words');

// ---- Court 2 — THE SHELF: the manifest, the closure, the exact bytes ----
const manifest = JSON.parse(readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'));
assert.equal(
  Object.keys(manifest).some((k) => k.includes('SoulsWeb')),
  false,
  'the web keeps no manifest row of its own — it rides inside the Book, as the Chart does',
);
assert.ok(manifest['src/components/Book.jsx']?.isDynamicEntry, 'the Book still stands in the dynamic rolls');
const { entryKeys, closure } = entryClosureOf(manifest);
assert.equal(entryKeys.length, 1, `no new synchronous entry — the manifest names ${entryKeys.length}`);
assert.ok(
  ![...closure].some((k) => k.includes('SoulsWeb') || k === 'src/components/Book.jsx'),
  'neither the Book nor the web is reachable in the entry\u2019s synchronous closure',
);
const closureBytes = closureBytesOf(manifest, closure, DIST);
assert.equal(
  closureBytes,
  CLOSURE_BYTES_PIN,
  `the closure is UNMOVED at its exact bytes — measured ${closureBytes}, pinned ${CLOSURE_BYTES_PIN}; the web rides the Book\u2019s chunk or nowhere, and a lawful move re-seats this pin only in the same owner ruling as the lean door\u2019s`,
);
const bookChunk = readFileSync(path.join(DIST, manifest['src/components/Book.jsx'].file), 'utf8');
assert.ok(bookChunk.includes('The web of souls'), 'the built Book chunk carries the web — the words ride the lazy shelf');
// THE DENYLIST (architect's round, taken on the spot): the manual
// examination that ruled the nine bytes is now the court's own tooth —
// the entry chunk asserted clean of the web's words on EVERY run, so an
// equal-byte substitution can never hide behind the exact pin.
const entryChunk = readFileSync(path.join(DIST, manifest[entryKeys[0]].file), 'utf8');
for (const word of ['The web of souls', 'bound by blood', 'sworn enemies', 'web-strand', 'souls-web']) {
  assert.ok(!entryChunk.includes(word), `the entry chunk is denylist-clean of the web's words (found: ${word}) — the surface rides the Book's shelf or nowhere`);
}

// ---- The fixture tale: the engine twin's own six turns, seated table-side ----
const dmEnvelope = (over = {}) => ({
  narration_blocks: [], suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null,
  time_advance: null, entropy_use: [], ...over
});
const LOGS = [
  { id: 'e1', turn: 1, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Mira', role: 'healer', visual: 'Grey-eyed', voice: 'Warm', goal: 'mend the well', secret: 'SECRET-RING-9Q4X' }] } }) },
  { id: 'e2', turn: 2, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Tam', role: 'brother of Mira', visual: 'Wiry', voice: 'Quick', goal: 'map the road' }] } }) },
  { id: 'e3', turn: 3, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Brannoc', text: 'The vale is already mine.' }, { speaker: 'Mira', text: 'The vale answers to no crown.' }], story: { cast_add: [{ name: 'Brannoc', role: 'villain', visual: 'Crowned in wax', voice: 'Cold', goal: 'drain the vale' }] } }) },
  { id: 'e4', turn: 4, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Mira', text: 'Hold the lantern high.' }, { speaker: 'Tam', text: 'The ford is watching us.' }], story: { cast_update: [{ name: 'Mira', bond_delta: 3, bond_reason: 'Stood between the hero and the arch' }] } }) },
  { id: 'e5', turn: 5, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Edda', role: 'lantern-bearer', visual: 'Ash in her braid', voice: 'Low', goal: 'carry the light' }], cast_update: [{ name: 'Mira', known_as_add: 'The Rowan Witch' }] } }) },
  { id: 'e6', turn: 6, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'The Rowan Witch', text: 'The well remembers.' }], story: { cast_update: [{ name: 'Edda', status: 'dead', last_seen: 'the ford, at rest' }] } }) }
];
const fixtureCampaign = deepFreeze({
  id: 'c-web-fixture',
  hero: { name: 'Aldric', className: 'Warden' },
  codex: {
    arc: { evil_plot: 'DESIGN-TOKEN-7M2K drinks the valley dry' },
    cast: [
      { name: 'Mira', role: 'healer', status: 'active', bond: 3, introduced_turn: 1, known_facts: [], bond_arc: [] },
      { name: 'Tam', role: 'scout', status: 'active', bond: 1, introduced_turn: 2, known_facts: [], bond_arc: [] },
      { name: 'Edda', role: 'lantern-bearer', status: 'dead', bond: 2, introduced_turn: 5, known_facts: [], bond_arc: [] },
      { name: 'Brannoc', role: 'villain', secret: 'WEB-BAIT-4Q' }
    ]
  },
  logs: LOGS
});

const { default: SoulsWeb } = await import('../src/components/SoulsWeb.jsx');
const { STATUS_WORD } = await import('../src/components/Book.jsx');

// ---- Court 3 — THE RENDER: house words, the dead at rest, the unmet absent ----
const navLog = [];
let root;
await act(async () => { root = TestRenderer.create(h(SoulsWeb, { campaign: fixtureCampaign, onNav: (part) => navLog.push(part), statusWord: STATUS_WORD })); });
{
  const tree = root.toJSON();
  const bytes = JSON.stringify(tree);
  for (const token of ['Brannoc', 'WEB-BAIT-4Q', 'DESIGN-TOKEN-7M2K', 'SECRET-RING-9Q4X', 'The Rowan Witch']) {
    assert.ok(!bytes.includes(token), `the unmet, their secrets, and stray epithets are ABSENT from every rendered byte (leaked: ${token})`);
  }
  const text = textOf(tree);
  for (const words of ['bound by blood', 'sworn enemies', 'oath and bond', 'paths crossed', 'sealed at turn', 'tap a soul to open their page']) {
    assert.ok(text.toLowerCase().includes(words.toLowerCase()), `the web speaks house words — missing: ${words}`);
  }
  assert.doesNotMatch(text, /\b(nodes?|edges?|graph)\b/i, 'never machinery words — souls and strands, not nodes and edges');
  const souls = collectByClass(tree, 'web-soul');
  assert.deepEqual(souls.map((soul) => textOf(soul).replace(/[^A-Za-z]/g, '').match(/Aldric|Mira|Tam|Edda/)?.[0]), ['Aldric', 'Mira', 'Tam', 'Edda'], 'the four known souls stand, in the record\u2019s own order');
  const heroSeat = collectByClass(tree, 'the-hero');
  assert.equal(heroSeat.length, 1, 'the hero alone holds the centre');
  assert.ok(textOf(heroSeat[0]).includes('Aldric'), 'and the centre is the hero');
  const atRest = collectByClass(tree, 'at-rest');
  assert.equal(atRest.length, 1, 'one soul rests');
  assert.ok(textOf(atRest[0]).includes('Edda') && textOf(atRest[0]).includes('Fallen'), 'the dead render marked, in the record\u2019s own word — Fallen');
  assert.equal(collectByClass(tree, 'web-strand-kin').length, 1, 'one kin strand — bound by blood');
  assert.equal(collectByClass(tree, 'web-strand-ally').length, 1, 'one oath strand');
  assert.equal(collectByClass(tree, 'web-strand-met').length, 1, 'one crossing — the strand toward the unmet is absence');
  assert.equal(collectByClass(tree, 'web-strand-enemy').length, 0, 'no enemy strand — the unrevealed tie does not tease');
  const miraSeat = collectWhere(tree, (n) => String(n.props?.['aria-label'] || '').startsWith('Mira')); 
  assert.equal(miraSeat.length, 1, 'Mira holds one seat');
  await act(async () => { miraSeat[0].props.onClick(); });
  assert.deepEqual(navLog.at(-1), { chapter: 'people', place: null, soul: 'Mira' }, 'a tapped soul opens toward their page in the Book\u2019s own manner');
  await act(async () => { miraSeat[0].props.onKeyDown({ key: 'Enter', preventDefault() {} }); });
  assert.deepEqual(navLog.at(-1), { chapter: 'people', place: null, soul: 'Mira' }, 'and the key opens the same door');
  assert.equal(navLog.length, 2, 'two asks, two doors — nothing self-opens');
}

// ---- Court 4 — THE ELDER SAVE: pre-web, deep-frozen, lawful ----
const elder = deepFreeze({
  id: 'c-elder',
  hero: { name: 'Aldric' },
  codex: {
    cast: [
      { name: 'Mira', known_facts: ['Tended the wound'] },
      { name: 'Edda', status: 'dead' },
      { name: 'Brannoc' }
    ]
  },
  logs: LOGS.slice(0, 4)
});
{
  let elderRoot;
  await act(async () => { elderRoot = TestRenderer.create(h(SoulsWeb, { campaign: elder, onNav: () => {}, statusWord: STATUS_WORD })); });
  const bytes = JSON.stringify(elderRoot.toJSON());
  assert.ok(bytes.includes('Mira'), 'the grandfather bench seats — a stampless soul the record has moved still stands');
  assert.ok(bytes.includes('Aldric'), 'the hero stands the centre of an elder web');
  assert.ok(!bytes.includes('Tam'), 'a soul the elder canon never registered is absence, even with a card in the log');
  assert.ok(!bytes.includes('Brannoc'), 'canon without record stays absence on an elder save');
  assert.ok(bytes.includes('web-strand-ally'), 'the elder record\u2019s own proven bond still strings its strand');
}

// ---- Court 5 — the lone soul and the empty loom speak, never crash ----
{
  let loneRoot;
  await act(async () => { loneRoot = TestRenderer.create(h(SoulsWeb, { campaign: deepFreeze({ hero: { name: 'Aldric' }, codex: { cast: [] }, logs: [] }), onNav: () => {}, statusWord: STATUS_WORD })); });
  assert.match(textOf(loneRoot.toJSON()), /The web waits/, 'one known soul: the web says so, plainly');
  let bareRoot;
  await act(async () => { bareRoot = TestRenderer.create(h(SoulsWeb, { campaign: null, onNav: () => {}, statusWord: STATUS_WORD })); });
  assert.match(textOf(bareRoot.toJSON()), /No soul has entered the record yet/, 'no record: the loom stands honestly empty');
}

// ---- Court 6 — the reading reached for no wire ----
assert.equal(fetchLog.length, 0, `the web commissions nothing — zero fetches (saw: ${fetchLog.join(', ')})`);

console.log('PASS — the web of souls seating: the web rides the Book\u2019s own chunk (no row of its own, no new entry, the closure unmoved at its exact bytes), the surface asks the wiki\u2019s own reveals seat and grows no private reading, the render speaks house words with the dead at rest and the unmet absent from every byte, a soul opens toward their page by tap and by key, and a pre-web save renders deep-frozen — the grandfather bench seats, canon without record stays absence, zero fetches');
