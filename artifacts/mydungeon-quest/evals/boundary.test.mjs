// THE BOUNDARY GATE (Directive XII §VII.1) — the Book and the Traveler's
// Chart fail CLOSED against malformed campaign and log shapes. Malformed
// rows prove nothing, panels speak plainly (a cannot-be-read line, an
// honest unknown, or waiting vellum), and nothing crashes. Headless —
// no AI keys, no browser — react-test-renderer + fake-indexeddb, the
// standing component-harness pattern.
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

// The smallest possible stage, as the standing harness sets it.
const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};
globalThis.sessionStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.fetch = async () => ({ ok: false, blob: async () => new Blob([], { type: 'application/octet-stream' }), json: async () => null, headers: { get: () => null } });

const { createHero } = await import('fatescript/rules');
const { applyStoryUpdates, initCodex } = await import('fatescript/story');
const { Book } = await import('../src/components/Book.jsx');
const TravelersChart = (await import('../src/components/TravelersChart.jsx')).default;

let courts = 0;
const court = (name, fn) => { fn(); courts += 1; console.log(`  ✓ ${name}`); };

const renderTree = (element) => {
  let renderer;
  act(() => { renderer = TestRenderer.create(element); });
  const tree = renderer.toJSON();
  act(() => renderer.unmount());
  return tree;
};
const textOf = (tree) => JSON.stringify(tree ?? '');

const bookProps = (campaign, nav = { chapter: 'tale' }) => ({
  campaign, nav, onNav() {}, recap: null, reduceMotion: true,
  onClose() {}, onReplay() {}, onSealTale: null
});

const CHAPTER_WALK = ['tale', 'people', 'places', 'things', 'debts', 'party', 'no-such-chapter'];

// —— campaigns ——
// The honest tale folds its one story into the codex the same way play
// does — the people page lists the CODEX cast; the wiki cites the log.
const wholeCodex = () => applyStoryUpdates(initCodex('classic-epic'), {
  cast_add: [{ name: 'Karsa Reed', role: 'ally', visual: 'A weathered scout in a moss-green hood.', voice: 'Low and unhurried.', goal: 'See the pass before the snow.', secret: 'She buried the last map she drew.' }],
  chronicle_add: 'Karsa Reed joined the road north.'
}, { turn: 1, heroName: 'Maren Vale', heroLevel: 1 });

const wholeTale = () => ({
  id: 'boundary-whole', title: 'The Boundary Proof', readOnly: false,
  hero: createHero({ name: 'Maren Vale' }), codex: wholeCodex(),
  logs: [{
    id: 'log-1', kind: 'turn', turn: 1, redacted: false,
    dm: {
      narration_blocks: [{ text: 'The road bent north under old rain.' }],
      story: {
        cast_add: [{ name: 'Karsa Reed', role: 'ally', visual: 'A weathered scout in a moss-green hood.', voice: 'Low and unhurried.', goal: 'See the pass before the snow.', secret: 'She buried the last map she drew.' }],
        chronicle_add: 'Karsa Reed joined the road north.'
      },
      state_updates: {}
    }
  }],
  turnNumber: 1
});

const JUNK_ROWS = [
  null, 42, 'rot', true, [],
  {},
  { kind: 'turn' },
  { kind: 'turn', turn: 'x', dm: 'rot' },
  { kind: 'turn', turn: 2, dm: { story: 'rot', state_updates: 'rot', narration_blocks: 'rot' } },
  { kind: 'turn', turn: 3, redacted: 'maybe', dm: { story: { cast_add: 'rot', purse: 'rot', sheet_condition: 9, party_join: [] } } },
  { kind: 'tick', turn: 4, tick: 'rot' },
  { kind: 'annal', turn: 'never' }
];

// ---------------------------------------------------------------
// I. THE CONTROL — a whole tale renders every chapter. The court must
// know the instrument measures before it trusts a refusal.
// ---------------------------------------------------------------
court('a whole tale opens every chapter of the Book', () => {
  for (const chapter of CHAPTER_WALK) {
    const tree = renderTree(h(Book, bookProps(wholeTale(), { chapter })));
    assert.ok(tree, `the ${chapter} page stands`);
  }
});

// ---------------------------------------------------------------
// II. MALFORMED LOG ROWS — every chapter still stands; junk rows prove
// nothing; no junk value is ever spoken as tale.
// ---------------------------------------------------------------
court('a log full of rot cannot bring the Book down, on any chapter', () => {
  const campaign = { ...wholeTale(), logs: [...JUNK_ROWS] };
  for (const chapter of CHAPTER_WALK) {
    const tree = renderTree(h(Book, bookProps(campaign, { chapter })));
    assert.ok(tree, `the ${chapter} page survives the rot`);
    assert.ok(!textOf(tree).includes('rot'), `the ${chapter} page proves nothing from junk`);
  }
});

court('junk rows beside honest rows prove nothing — the honest tale still reads', () => {
  const campaign = wholeTale();
  campaign.logs = [...JUNK_ROWS, ...campaign.logs, ...JUNK_ROWS];
  const people = renderTree(h(Book, bookProps(campaign, { chapter: 'people' })));
  assert.ok(textOf(people).includes('Karsa Reed'), 'the honest soul keeps her page');
  assert.ok(!textOf(people).includes('rot'), 'the rot earns no name');
  const tale = renderTree(h(Book, bookProps(campaign, { chapter: 'tale' })));
  assert.ok(tale, 'the tale page stands with rot on both sides');
});

court('a soul\u2019s page beside junk presence rows speaks plainly, never inventing ground', () => {
  const campaign = wholeTale();
  campaign.logs = [...campaign.logs, ...JUNK_ROWS];
  const tree = renderTree(h(Book, bookProps(campaign, { chapter: 'people', soul: 'Karsa Reed' })));
  const text = textOf(tree);
  assert.ok(/Whereabouts unknown|Last seen standing|cannot be read/.test(text),
    'the presence panel speaks — an honest unknown or its cannot-be-read oath');
  assert.ok(!text.includes('rot'), 'no ground is invented from junk');
});

// ---------------------------------------------------------------
// III. MALFORMED CAMPAIGN SHAPES — logs as a string, logs missing,
// codex lanes rotten. The Book stands; the panels speak.
// ---------------------------------------------------------------
court('logs that are not a list cannot bring the Book down', () => {
  for (const rot of ['rot', 42, null, undefined, { not: 'a list' }]) {
    const campaign = { ...wholeTale(), logs: rot };
    for (const chapter of ['tale', 'people', 'places', 'debts']) {
      const tree = renderTree(h(Book, bookProps(campaign, { chapter })));
      assert.ok(tree, `the ${chapter} page stands over logs=${String(rot)}`);
    }
  }
});

court('rotten codex lanes cannot bring the Book down', () => {
  const campaign = wholeTale();
  campaign.codex = { ...campaign.codex, party: 'rot', threads: 'rot', regions: [], notes: [] };
  for (const chapter of ['tale', 'people', 'places', 'things', 'debts', 'party']) {
    assert.ok(renderTree(h(Book, bookProps(campaign, { chapter }))), `the ${chapter} page stands`);
  }
});

// ---------------------------------------------------------------
// IV. THE TRAVELER'S CHART — junk draws no roads; the vellum waits and
// says so; a rotten campaign never crashes the chart.
// ---------------------------------------------------------------
court('the chart over an empty or rotten record speaks the waiting vellum', () => {
  const shapes = [
    { ...wholeTale(), logs: [] },
    { ...wholeTale(), logs: 'rot' },
    { ...wholeTale(), logs: [...JUNK_ROWS] },
    { id: 'bare', codex: { regions: 'rot' }, logs: undefined },
    null,
    undefined
  ];
  for (const campaign of shapes) {
    const tree = renderTree(h(TravelersChart, { campaign, gallery: {}, onOpenPlace() {} }));
    const text = textOf(tree);
    assert.ok(/vellum waits/.test(text), 'the chart says plainly that no ground is known');
    assert.ok(!text.includes('rot'), 'no medallion is cut from junk');
  }
});

court('the places chapter carries the waiting chart over junk without falling', () => {
  const campaign = { ...wholeTale(), logs: [...JUNK_ROWS] };
  const tree = renderTree(h(Book, bookProps(campaign, { chapter: 'places' })));
  assert.ok(tree, 'the places page stands');
  assert.ok(/vellum waits/.test(textOf(tree)), 'and the chart within it speaks');
});

console.log(`PASS — BOUNDARY GATE: ${courts} courts sat, all green. The Book fails closed; the vellum waits; nothing crashes.`);
