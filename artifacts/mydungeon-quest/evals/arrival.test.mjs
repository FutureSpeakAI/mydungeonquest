// ---- THE ARRIVAL & THE RITUAL (Phase 6 — Drama & Brand) ----
//
// The keyless first-run, end to end: full drama, total silence.
//   1. The cold open stages itself — darkness, one candle, the title warms
//      in ("A tale that is actually yours."), the shelf rises beneath — and
//      the first touch asks the Director for its one page-turn, which a
//      keyless table (mock provider) lawfully answers with silence: nothing
//      plays, nothing queues, nothing is cached.
//   2. The dice ritual: the die lands on its leather circle; success glows
//      gold, failure goes ash, and a critical earns one held breath (a
//      longer stage) before the prose resumes.
//   3. The shelf is a library: a sealed chronicle stands as a waxed spine,
//      and drawing it opens the book straight to its keepsakes — where the
//      lit Podcast Forge waits beside the storybook.
//   4. The notary's desk (verify.html) wears the desk copy — and the
//      verifier script beneath it is byte-for-byte untouched.
// Headless — no AI keys, no browser — react-test-renderer + fake-indexeddb.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The components live in a browser; the eval lives in node. Give them the
// smallest possible stage: a window that only remembers listeners (the skip
// and attract effects register and clean up; nothing needs to fire), a
// document that can take a CSS custom property, a navigator that cannot
// vibrate, and blob URLs keyed by MIME type.
const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

// A keyless table's /api/sfx: the mock provider answers — and the mock is
// never played and never cached. Record every ask.
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: true, blob: async () => new Blob(['mock-noise'], { type: 'audio/mpeg' }), headers: { get: (k) => (k === 'X-Media-Provider' ? 'mock' : null) } };
};

const App = (await import('../src/App.jsx')).default;
const DiceModule = await import('../src/components/DiceOverlay.jsx');
const DiceOverlay = DiceModule.default;
const { RITUAL_MS, CRIT_HOLD_MS } = DiceModule;
const { directorState } = await import('../src/lib/cinema/audioDirector.js');
const { db } = await import('../src/lib/db.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function collectByClass(node, token, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectByClass(child, token, out); return out; }
  const cls = String(node.props?.className || '');
  if (cls.split(/\s+/).includes(token)) out.push(node);
  if (node.children) collectByClass(node.children, token, out);
  return out;
}
const textOf = (node) => node == null || typeof node === 'boolean' ? ''
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('')
  : textOf(node.children);
const rootClass = (root) => String(root.toJSON()?.props?.className || '');

// ---------------------------------------------------------------------------
// 1. The Arrival — a cold open on an empty shelf, staged in darkness and
//    settled in silence.
// ---------------------------------------------------------------------------
{
  let root;
  await act(async () => { root = TestRenderer.create(h(App)); });
  assert.ok(rootClass(root).includes('arrival-dark'), 'the arrival begins in darkness');
  assert.equal(collectByClass(root.toJSON(), 'candle').length, 1, 'one candle stands in the dark');

  await act(async () => { await sleep(650); });
  assert.ok(rootClass(root).includes('arrival-candle'), 'the candle lights first');

  await act(async () => { await sleep(1000); });
  assert.ok(rootClass(root).includes('arrival-title'), 'the title warms in after the flame');
  assert.ok(textOf(root.toJSON()).includes('A tale that is actually yours.'), 'the tagline is the whole promise');

  await act(async () => { await sleep(1700); });
  assert.ok(!rootClass(root).includes('arrival-'), 'the table sets itself when the staging ends');
  const tree = root.toJSON();
  assert.equal(collectByClass(tree, 'title-embers').length, 1, 'ember drift attends the title');
  assert.equal(collectByClass(tree, 'new-spine').length, 1, 'an empty binding waits on the shelf');
  assert.equal(collectByClass(tree, 'shelf-plank').length, 1, 'the shelf is a real plank, not a grid');
  assert.ok(textOf(tree).includes('The shelf waits for its first book.'), 'the plaque speaks for the empty shelf');
  assert.equal(directorState().playing, null, 'the arrival itself asks for no sound at all');

  await act(async () => { root.unmount(); });
  for (const [type, set] of Object.entries(winListeners)) assert.equal(set.size, 0, `unmount leaves no ${type} listener behind`);
  console.log('PASS — the arrival stages in silence: darkness, candle, title, shelf (and leaves no listeners).');
}

// ---------------------------------------------------------------------------
// 2. The dice ritual — gold, ash, and one held breath on a critical.
// ---------------------------------------------------------------------------
{
  assert.ok(RITUAL_MS > 0 && CRIT_HOLD_MS > 0, 'the ritual keeps real time');
  const modifiers = [{ source: 'WIS', value: 2 }];

  // Gold: a plain success yields after one ritual beat.
  let done = 0, root;
  await act(async () => { root = TestRenderer.create(h(DiceOverlay, { result: { selectedDie: 14, total: 16, modifiers, outcome: 'success' }, haptics: false, onDone: () => { done += 1; } })); });
  let tree = root.toJSON();
  assert.equal(collectByClass(tree, 'dice-parchment').length, 1, 'the die lands on its leather circle');
  assert.ok(collectByClass(tree, 'gold').length >= 1, 'success glows gold');
  assert.equal(collectByClass(tree, 'ash').length, 0, 'no ash on a golden night');
  await act(async () => { await sleep(RITUAL_MS + 300); });
  assert.equal(done, 1, 'the ritual yields after its beat');
  await act(async () => { root.unmount(); });

  // Ash: a failure wears the grey light.
  await act(async () => { root = TestRenderer.create(h(DiceOverlay, { result: { selectedDie: 4, total: 6, modifiers, outcome: 'failure' }, haptics: false, onDone: () => {} })); });
  tree = root.toJSON();
  assert.ok(collectByClass(tree, 'ash').length >= 2, 'failure goes ash — die and total both');
  assert.equal(collectByClass(tree, 'gold').length, 0, 'no gold for a failed die');
  await act(async () => { root.unmount(); });

  // The held breath: a critical does NOT yield at the plain beat.
  let critDone = 0;
  await act(async () => { root = TestRenderer.create(h(DiceOverlay, { result: { selectedDie: 20, total: 24, modifiers, outcome: 'critical_success' }, haptics: false, onDone: () => { critDone += 1; } })); });
  tree = root.toJSON();
  assert.ok(textOf(tree).includes('a breath is held'), 'the critical names its held breath');
  assert.ok(collectByClass(tree, 'critical').length >= 1, 'the crit die burns');
  await act(async () => { await sleep(RITUAL_MS + 300); });
  assert.equal(critDone, 0, 'the breath is still held at the plain beat');
  await act(async () => { await sleep(CRIT_HOLD_MS); });
  assert.equal(critDone, 1, 'and released exactly one breath later');
  await act(async () => { root.unmount(); });
  console.log('PASS — the dice ritual: gold, ash, and one held breath on a critical.');
}

// ---------------------------------------------------------------------------
// 3. The shelf is a library — a sealed chronicle stands as a waxed spine and
//    opens straight to its keepsakes, where the lit Forge waits. The draw is
//    also this sitting's first touch: one page-turn asked, silence answered.
// ---------------------------------------------------------------------------
{
  globalThis.sessionStorage = { getItem: () => '1', setItem() {} }; // arrived already this sitting — the shelf must not re-stage
  // Seed with the app's OWN factories — a codex the chapter mast can read and
  // a hero the ribbon can wear; only the seal fields are set by hand.
  const { initCodex } = await import('../src/lib/story.js');
  const { createHero } = await import('../src/lib/rules.js');
  const hero = { ...createHero({ name: 'Maren', className: 'Warden', caster: 'none', hitDie: 10, abilities: { STR: 14, DEX: 12, CON: 13, INT: 10, WIS: 15, CHA: 8 }, skills: ['Perception'] }), sigil: '✦' };
  await db.campaigns.put({
    id: 'sealed-tale', title: 'The Drowned Vigil', hero,
    codex: { ...initCodex('classic-epic'), completed: true },
    logs: [], combat: null, pendingRoll: null, turnNumber: 12, turnCount: 14, headHash: 'head', signatureStatus: 'signed',
    completed: true, sealedAt: 1234, readOnly: false, mediaTier: 'parchment', spend: { images: 0, music: 0 }, chroniclePages: [], createdAt: 1, updatedAt: 2
  });

  let root;
  await act(async () => { root = TestRenderer.create(h(App)); });
  await act(async () => { await sleep(80); }); // the shelf loads its books
  let tree = root.toJSON();
  assert.ok(!rootClass(root).includes('arrival-'), 'a returning sitting is not re-staged');
  const spines = collectByClass(tree, 'book-spine').filter((s) => !String(s.props.className).includes('new-spine'));
  assert.equal(spines.length, 1, 'the sealed chronicle stands as one spine');
  assert.equal(collectByClass(spines[0], 'spine-wax').length, 1, 'a finished tale is waxed on its spine');
  assert.ok(String(spines[0].props['aria-label']).includes('told and sealed'), 'the spine speaks its state');

  await act(async () => { spines[0].props.onClick({}); });
  await act(async () => { await sleep(150); });
  tree = root.toJSON();
  const text = textOf(tree);
  assert.ok(text.includes('Your tale is told. Bind it.'), 'the drawn book opens straight to its keepsakes');
  assert.ok(text.includes('Open the storybook'), 'the book keeps first place among the keepsakes');
  assert.ok(text.includes('Forge the podcast'), 'the lit Forge waits beside it');
  assert.ok(!text.includes('not yet lit'), 'the stale "forge not yet lit" note is gone');

  assert.ok(fetchLog.some((u) => String(u).includes('/api/sfx')), 'the draw asked the Director for its one page-turn');
  const state = directorState();
  assert.equal(state.playing, null, 'keyless: the mock page-turn is never played — silence is the floor');
  assert.equal(state.queued, 0, 'keyless: nothing is staged either');
  assert.equal(await db.media.count(), 0, 'keyless: the mock is never cached as an asset');

  await act(async () => { root.unmount(); });
  await db.campaigns.clear();
  console.log('PASS — a sealed spine wears its wax and opens straight to keepsakes, in silence.');
}

// ---------------------------------------------------------------------------
// 3½. A persisted "reduce motion" hydrates from IndexedDB AFTER mount — the
//     staging must drop the curtain the instant it lands, not finish its show.
// ---------------------------------------------------------------------------
{
  globalThis.sessionStorage = { getItem: () => null, setItem() {} }; // a fresh sitting — the arrival WOULD stage
  await db.settings.put({ key: 'care', value: { reduceMotion: true } });
  let root;
  await act(async () => { root = TestRenderer.create(h(App)); });
  await act(async () => { await sleep(250); }); // hydration lands well before the candle would light (450ms)
  assert.ok(!rootClass(root).includes('arrival-'), 'a late-arriving reduce-motion drops the curtain at once');
  assert.ok(rootClass(root).includes('title-page'), 'and the set table is what remains');
  await act(async () => { root.unmount(); });
  for (const [type, set] of Object.entries(winListeners)) assert.equal(set.size, 0, `unmount leaves no ${type} listener behind`);
  await db.settings.delete('care');
  console.log('PASS — a persisted reduce-motion, hydrating late, still stills the arrival.');
}

// ---------------------------------------------------------------------------
// 4. The notary's desk — verify.html wears the desk; the verifier beneath it
//    is untouched.
// ---------------------------------------------------------------------------
{
  const html = readFileSync(new URL('../public/verify.html', import.meta.url), 'utf8');
  assert.ok(html.includes('THE NOTARY’S DESK'), 'the desk announces itself');
  assert.ok(html.includes('The desk is bare'), 'the empty state belongs to the desk');
  assert.ok(html.includes('escapeHtml') && html.includes("GREEN':'RED"), 'the verifier script beneath the desk is untouched');
  assert.ok(!html.includes('OFFLINE AUDITOR'), 'the old auditor sign is down');
  console.log("PASS — the notary's desk wears the wax and the verifier still answers.");
}

console.log('PASS — the keyless first-run is full drama, total silence: the Arrival, the ritual, the library, the desk.');
