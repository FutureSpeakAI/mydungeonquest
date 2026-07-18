// ---- THE OPEN BOOK (Task 58C — Directive XIV) ----
//
// The Book component itself, rendered headless on a campaign seeded
// through the REAL primitives (seedProvingCampaign — the codex fold,
// the seal chain, the trove and purse folds; never a hand-built
// snapshot):
//   1. CHAPTERS is a closed set of six, in the directive's order.
//   2. The ribbon is CONTROLLED: a tab tap asks the table (onNav) and
//      turns no page by itself — only the nav prop turns pages.
//   3. Every chapter wears the codex head and the same day chip.
//   4. Each page carries its mapped surfaces WITH citations: souls
//      with first words, the chart with sealed crossings, packs with
//      one-tap provenance, threads with their sworn turns.
//   5. The party page's pack echo is a door to Things, not a copy.
//   6. reduceMotion passes through as data-stillness; the recap card
//      reads on the Tale page without a dismiss door.
//   7. The reading room never reaches for the wire: zero fetches.
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

const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

// The book is a reading room: nothing in it may reach for the wire.
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: false, blob: async () => new Blob([], { type: 'application/octet-stream' }), headers: { get: () => null } };
};

const { seedProvingCampaign } = await import('../src/lib/proving.js');
const { Book, CHAPTERS } = await import('../src/components/Book.jsx');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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

// ---------------------------------------------------------------------------
// The seed: the proving fixture, replayed through the same primitives the
// table uses — the codex fold, the seal chain, the memory ledger.
const fixture = JSON.parse(readFileSync(new URL('../tests/e2e/fixtures/proving-campaign.json', import.meta.url), 'utf8'));
const campaign = await seedProvingCampaign(fixture);
const heroName = campaign.hero.name;

// ---- 1. The closed set of six, in the directive's order ----
assert.deepEqual(CHAPTERS.map((chapter) => chapter.id), ['tale', 'people', 'places', 'things', 'debts', 'party'], 'six chapters, a closed set');
assert.deepEqual(CHAPTERS.map((chapter) => chapter.word), ['The Tale', 'The People', 'The Places', 'The Things', 'The Debts', 'The Party'], 'each chapter speaks its own word');

// ---------------------------------------------------------------------------
// The stage: a controlled Book — nav is OURS, exactly as the table holds it.
const navLog = [];
let nav = { chapter: 'tale', soul: null, place: null, pack: null };
const noop = () => {};
const propsOf = (extra = {}) => ({ campaign, nav, onNav: (part) => navLog.push(part), recap: null, reduceMotion: false, onClose: noop, onReplay: noop, onSealTale: noop, ...extra });
let root;
await act(async () => { root = TestRenderer.create(h(Book, propsOf())); });
await act(async () => { await sleep(40); }); // the gallery effect settles (keyless: no plates)
const show = async (patch, extra = {}) => { nav = { ...nav, ...patch }; await act(async () => { root.update(h(Book, propsOf(extra))); }); };
const press = async (node) => { await act(async () => { node.props.onClick(); }); };

// ---- 2. The first opening: tabs, head, tale page, no recap ----
{
  const tree = root.toJSON();
  const tabs = collectWhere(tree, (node) => typeof node.props['data-chapter'] === 'string');
  assert.deepEqual(tabs.map((tab) => tab.props['data-chapter']), CHAPTERS.map((chapter) => chapter.id), 'six tabs stand in the directive\'s order');
  assert.deepEqual(tabs.map((tab) => tab.props['aria-selected']), [true, false, false, false, false, false], 'the tale tab alone is selected');
  const pages = collectWhere(tree, (node) => typeof node.props['data-page'] === 'string');
  assert.deepEqual(pages.map((page) => page.props['data-page']), ['tale'], 'one page at a time — the tale');
  assert.equal(collectByClass(tree, 'codex-head').length, 1, 'the head stands over the book');
  assert.match(textOf(collectByClass(tree, 'codex-head')[0]), /Day 5/, 'the day chip reads the sealed clock');
  assert.match(textOf(tree), /The shape of the tale/, 'the tale page carries the arc');
  assert.match(textOf(tree), /Seal the Tale/, 'the seal invitation lives on the tale page');
  assert.equal(collectByClass(tree, 'recap-card').length, 0, 'no recap prop, no recap card');
}

// ---- 3. The controlled ribbon: a tap asks, only the prop turns ----
{
  const tabs = collectWhere(root.toJSON(), (node) => typeof node.props['data-chapter'] === 'string');
  await press(tabs.find((tab) => tab.props['data-chapter'] === 'people'));
  assert.deepEqual(navLog.at(-1), { chapter: 'people' }, 'the tab tap asks the table for the people chapter');
  assert.deepEqual(collectWhere(root.toJSON(), (node) => typeof node.props['data-page'] === 'string').map((page) => page.props['data-page']), ['tale'], 'the tap alone turns no page — the ribbon is the table\'s');
  await show({ chapter: 'people' });
  const tree = root.toJSON();
  assert.deepEqual(collectWhere(tree, (node) => typeof node.props['data-page'] === 'string').map((page) => page.props['data-page']), ['people'], 'the nav prop turns the page');
  assert.match(textOf(collectByClass(tree, 'codex-head')[0]), /Day 5/, 'the head rides every chapter');
}

// ---- 4. The People: souls with first words, cited ----
{
  let tree = root.toJSON();
  assert.ok(collectByClass(tree, 'soul-card').length >= 2, 'the cast stands in the grid');
  assert.match(textOf(tree), /Corin Voss/, 'the record\'s own souls are named');
  await show({ soul: 'Corin Voss' });
  tree = root.toJSON();
  const soulPage = collectByClass(tree, 'soul-page');
  assert.equal(soulPage.length, 1, 'a soul page opens from the nav');
  assert.match(textOf(soulPage[0]), /Corin Voss/, 'the page belongs to the soul');
  assert.match(textOf(soulPage[0]), /First words/, 'first words are kept');
  assert.match(textOf(soulPage[0]), /\(turn 3\)/, 'and cited to their sealed turn');
  await press(collectWhere(soulPage[0], (node) => node.type === 'button' && /All souls/.test(textOf(node)))[0]);
  assert.deepEqual(navLog.at(-1), { soul: null }, 'the way back asks the table too');
  await show({ soul: null });
}

// ---- 5. The Places: the chart's sealed roads, cited, doored ----
{
  await show({ chapter: 'places' });
  let tree = root.toJSON();
  assert.equal(collectByClass(tree, 'travelers-chart').length, 1, 'the chart hangs in Places');
  const medallions = collectByClass(tree, 'chart-medallion');
  assert.equal(medallions.length, 2, 'two medallions — the record\'s regions, nothing invented');
  assert.equal(collectByClass(tree, 'medallion-plateless').length, 2, 'keyless plates are honestly plateless');
  assert.equal(medallions.filter((m) => m.props['data-current'] === 'true' || m.props['data-current'] === true).length, 1, 'one current mark');
  assert.equal(collectByClass(tree, 'chart-road-label').length, 1, 'one sealed road');
  assert.equal(textOf(collectByClass(tree, 'chart-road-label')[0]), '1 day', 'the road speaks the calendar\'s own cost');
  const route = textOf(collectByClass(tree, 'chart-route')[0]);
  assert.match(route, /Larkspur Vale/, 'the route names the Vale');
  assert.match(route, /The Duchy/, 'and the Duchy');
  assert.match(route, /\(turn 5\)/, 'the outbound crossing cites its sealed TURN — tick rows shift indexes, never citations');
  assert.match(route, /\(turn 7\)/, 'the homecoming cites its sealed turn');
  assert.equal(collectByClass(tree, 'chart-vellum-note').length, 1, 'the blank vellum says why it is blank');
  const duchy = medallions.find((m) => m.props['data-region'] === 'The Duchy');
  await press(duchy);
  assert.deepEqual(navLog.at(-1), { place: 'The Duchy' }, 'a medallion is a door');
  await show({ place: 'The Duchy' });
  tree = root.toJSON();
  const placePage = collectByClass(tree, 'place-page');
  assert.equal(placePage.length, 1, 'the place page opens');
  assert.match(textOf(placePage[0]), /Entered the tale on turn 1/, 'the place cites its discovery row');
  await show({ place: null });
}

// ---- 6. The Things: packs — filtered troves, provenance one tap deep ----
{
  await show({ chapter: 'things' });
  let tree = root.toJSON();
  assert.match(textOf(tree), /The Trove/, 'the trove keeps its seat');
  const packs = collectWhere(tree, (node) => typeof node.props['data-pack'] === 'string');
  assert.deepEqual(packs.map((pack) => pack.props['data-pack']), [heroName, 'Edda'], 'hero first, then the companion');
  assert.equal(collectByClass(tree, 'pack-body').length, 0, 'packs rest closed');
  await show({ pack: 'Edda' });
  tree = root.toJSON();
  const edda = collectWhere(tree, (node) => node.props['data-pack'] === 'Edda')[0];
  assert.equal(collectByClass(edda, 'pack-body').length, 1, 'the nav prop opens the pack — the table holds this door too');
  assert.equal(textOf(collectByClass(edda, 'pack-law')[0]), 'This pack is the sealed trove, filtered to one bearer.', 'the pack law is spoken on the page');
  const holding = collectWhere(edda, (node) => node.type === 'button' && /ferry ledger/i.test(textOf(node)))[0];
  assert.ok(holding, 'the ferry ledger rides in Edda\'s pack');
  await press(holding);
  const chain = collectByClass(collectWhere(root.toJSON(), (node) => node.props['data-pack'] === 'Edda')[0], 'trove-chain');
  assert.equal(chain.length, 1, 'provenance is one tap deep');
  assert.match(textOf(chain[0]), new RegExp(`${heroName} \\(turn \\d+\\) → Edda \\(turn \\d+\\)`), 'the chain of hands, each cited');
  await show({ pack: null });
}

// ---- 7. The Debts: threads with their sworn turns ----
{
  await show({ chapter: 'debts' });
  const tree = root.toJSON();
  assert.match(textOf(tree), /The Open Threads/, 'the debts chapter keeps the ledger');
  assert.ok(collectByClass(tree, 'thread-row').length >= 1, 'the sworn threads stand');
  assert.match(textOf(tree), /sworn turn 0/, 'each thread cites the turn that swore it');
}

// ---- 8. The Party: the strip, the sheet, the pack echo as a door ----
{
  await show({ chapter: 'party' });
  const tree = root.toJSON();
  assert.match(textOf(tree), /The party — who rides with the hero/, 'the party page speaks its charge');
  const strip = collectByClass(tree, 'party-strip');
  assert.equal(strip.length, 1, 'the strip stands');
  assert.match(textOf(strip[0]), /Edda/, 'Edda rides');
  // The proving record grants Edda no companion sheet — so the strip
  // shows none: the sheet law's arithmetic is proven on the doom fixture
  // (G23); here the court proves the strip INVENTS nothing.
  assert.equal(collectByClass(strip[0], 'sheet-line').length, 0, 'no sheet granted, no sheet line — the strip refuses to invent arithmetic');
  const echo = collectByClass(tree, 'pack-echo');
  assert.equal(echo.length, 1, 'one echo per bearer');
  assert.match(textOf(echo[0]), /^\d+ coin · \d+ held — open the pack$/, 'the echo counts, and offers the door');
  await press(echo[0]);
  assert.deepEqual(navLog.at(-1), { chapter: 'things', pack: 'Edda' }, 'the echo doors through to the pack itself');
}

// ---- 9. Stillness and the recap reading ----
{
  await show({ chapter: 'tale' }, { reduceMotion: true, recap: { campaignId: campaign.id, kind: 'moment', mast: { arc: 'The Proving', act: 1, chapter: 'The Road Home' } } });
  const tree = root.toJSON();
  const body = collectByClass(tree, 'book-body');
  assert.equal(body.length, 1, 'the book body stands');
  assert.equal(body[0].props['data-stillness'], 'true', 'reduceMotion wears data-stillness through the book');
  const recapCards = collectByClass(tree, 'recap-card');
  assert.equal(recapCards.length, 1, 'the recap reads on the tale page');
  assert.match(textOf(recapCards[0]), /The tale so far/, 'as the tale so far');
  assert.doesNotMatch(textOf(recapCards[0]), /Return to the road/, 'a reading has no dismiss door');
  await show({}, { reduceMotion: false });
  const still = collectByClass(root.toJSON(), 'book-body')[0].props['data-stillness'];
  assert.notEqual(still, 'true', 'motion allowed, stillness unworn');
}

// ---- 10. The reading room never reached for the wire ----
assert.equal(fetchLog.length, 0, `the book commissions nothing — zero fetches (saw: ${fetchLog.join(', ')})`);

console.log('PASS — the open book: six chapters on a controlled ribbon, cited pages, lawful packs, still surfaces, zero fetches');
