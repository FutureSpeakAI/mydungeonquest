// ---------------------------------------------------------------------------
// CLASS DECK GATE (C3) — swipeable class card deck at step 2 of creation.
// Proofs:
//   1. classDeck.js exports CLASS_DECK (8 entries), CLASS_DECK_DEFAULT (6),
//      CLASS_EQUIPMENT (8 keys), STAT_LABELS, swapStat.
//   2. Every CLASS_DECK entry has className, role, gear, asset, assetPosition.
//   3. Every asset is a bundled /reel/ path.
//   4. CLASS_DECK_DEFAULT is exactly the first 6 entries.
//   5. swapStat keeps total = 72 and changes at least one stat.
//   6. CLASS_EQUIPMENT has an entry for every class in CLASSES.
//   7. Step 1 (Class) renders class-deck-card buttons immediately (≥ 6).
//   8. Tapping a class card marks it selected and keeps primary button enabled.
//   9. ZERO smithSpin calls fire on any path through Step 2
//      (source-text proof — no smithSpin invocation in the Class step block).
//  10. The expanded stat array sums to 72 for every class with default abilities.
// ---------------------------------------------------------------------------
process.env.DM_PROVIDER = 'mock';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { register, createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// ── 1. Source proofs ────────────────────────────────────────────────────────
const forgeSrc = readFileSync(join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const deckSrc = readFileSync(join(ROOT, 'src/lib/classDeck.js'), 'utf8');

check(forgeSrc.includes("from '../lib/classDeck.js'"), 'Forge.jsx imports from classDeck.js');
check(forgeSrc.includes('class-deck-grid'), 'Forge.jsx renders a .class-deck-grid element');
check(forgeSrc.includes('ClassDeckCard'), 'Forge.jsx uses ClassDeckCard component');
check(deckSrc.includes('export const CLASS_DECK'), 'classDeck.js exports CLASS_DECK');
check(deckSrc.includes('export const CLASS_DECK_DEFAULT'), 'classDeck.js exports CLASS_DECK_DEFAULT');
check(deckSrc.includes('export const CLASS_EQUIPMENT'), 'classDeck.js exports CLASS_EQUIPMENT');
check(deckSrc.includes('export const STAT_LABELS'), 'classDeck.js exports STAT_LABELS');
check(deckSrc.includes('export function swapStat'), 'classDeck.js exports swapStat');

// ── 2. Zero generation on Class step — source-text proof ───────────────────
// Isolate the Class step JSX block (between "Step 1: Class" and "Step 2: Face").
const classStepMatch = forgeSrc.match(/Step 1: Class[\s\S]*?Step 2: Face/);
const classBlock = classStepMatch ? classStepMatch[0] : '';
check(classBlock.length > 0, 'Class step block found in Forge.jsx source');
// smithSpin must not appear in the Class step block at all.
check(!classBlock.includes('smithSpin'), 'zero smithSpin calls in the Class step block (no generation ever)');
// shuffleHero (which calls smithSpin) must not be called in the Class step block.
check(!classBlock.includes('shuffleHero()'), 'shuffleHero not invoked from the Class step');

// ── 3. Fixture runtime: CLASS_DECK, CLASS_DECK_DEFAULT, STAT_LABELS ─────────
const { CLASS_DECK, CLASS_DECK_DEFAULT, CLASS_EQUIPMENT, STAT_LABELS, STAT_KEYS, swapStat } = await import('../src/lib/classDeck.js');

check(Array.isArray(CLASS_DECK), 'CLASS_DECK is an array');
check(CLASS_DECK.length === 8, `CLASS_DECK has exactly 8 entries (found ${CLASS_DECK.length})`);
check(Array.isArray(CLASS_DECK_DEFAULT), 'CLASS_DECK_DEFAULT is an array');
check(CLASS_DECK_DEFAULT.length === 6, `CLASS_DECK_DEFAULT has exactly 6 entries (found ${CLASS_DECK_DEFAULT.length})`);

// First 6 of CLASS_DECK match CLASS_DECK_DEFAULT.
for (let i = 0; i < 6; i++) {
  check(CLASS_DECK_DEFAULT[i].className === CLASS_DECK[i].className,
    `CLASS_DECK_DEFAULT[${i}] = CLASS_DECK[${i}] (${CLASS_DECK[i].className})`);
}

// ── 4. Each entry has required fields and a bundled asset ──────────────────
const REQUIRED = ['className', 'role', 'gear', 'asset', 'assetPosition'];
for (const entry of CLASS_DECK) {
  for (const field of REQUIRED) {
    check(
      entry[field] !== undefined && entry[field] !== null && String(entry[field]).length > 0,
      `CLASS_DECK "${entry.className}": field "${field}" is present and non-empty`
    );
  }
  check(
    typeof entry.asset === 'string' && entry.asset.startsWith('/reel/'),
    `CLASS_DECK "${entry.className}": asset is a /reel/ path (value: "${entry.asset}")`
  );
}

// ── 5. CLASS_EQUIPMENT has an entry for every class ────────────────────────
const { CLASSES } = await import('fatescript/forgeRolls');
for (const cls of CLASSES) {
  check(
    Array.isArray(CLASS_EQUIPMENT[cls.className]) && CLASS_EQUIPMENT[cls.className].length > 0,
    `CLASS_EQUIPMENT has a non-empty array for ${cls.className}`
  );
}

// ── 6. STAT_LABELS covers all 6 ability stats ──────────────────────────────
for (const key of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
  check(typeof STAT_LABELS[key] === 'string' && STAT_LABELS[key].length > 0, `STAT_LABELS has an entry for ${key}`);
}

// ── 7. swapStat keeps total = 72 and produces a change ────────────────────
const STANDARD_ABILITIES = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
const totalOf = (ab) => Object.values(ab).reduce((a, b) => a + b, 0);
check(totalOf(STANDARD_ABILITIES) === 72, 'STANDARD_ABILITIES baseline total is 72');

for (const statKey of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
  const swapped = swapStat({ ...STANDARD_ABILITIES }, statKey, 42);
  check(totalOf(swapped) === 72, `swapStat(${statKey}, 42) keeps total = 72`);
  const changed = Object.entries(swapped).some(([k, v]) => v !== STANDARD_ABILITIES[k]);
  check(changed, `swapStat(${statKey}, 42) actually changes the array`);
}

// swapStat on every class's rolled abilities also keeps total = 72.
const { rollAbilities } = await import('fatescript/forgeRolls');
for (const cls of CLASSES) {
  const ab = rollAbilities(cls.className, 7);
  const total = totalOf(ab);
  check(total === 72, `rollAbilities(${cls.className}) sums to 72 (got ${total})`);
  const swapped = swapStat({ ...ab }, cls.order[0], 99);
  check(totalOf(swapped) === 72, `swapStat on ${cls.className} top-priority stat keeps total = 72`);
}

// ── 8. JSX runtime: class deck renders 6 cards at step 1 ──────────────────
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(`l:${k}`) ? store.get(`l:${k}`) : null), setItem: (k, v) => store.set(`l:${k}`, String(v)), removeItem: (k) => store.delete(`l:${k}`) };
globalThis.sessionStorage = { getItem: (k) => (store.has(`s:${k}`) ? store.get(`s:${k}`) : null), setItem: (k, v) => store.set(`s:${k}`, String(v)), removeItem: (k) => store.delete(`s:${k}`) };
globalThis.window = globalThis.window || { location: { search: '', href: 'http://localhost/' } };

const { CreationRouter } = await import('../src/components/Forge.jsx');

// Render and advance to Class step.
let worldReady = null;
let tree;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment', onBack: () => {}, onWorldReady: (w) => { worldReady = w; }, onBegin: () => {},
  }));
});

// Tap the World primary button to advance to Class step.
const primaryBtns = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(worldReady !== null, 'onWorldReady fired when leaving World step');

const eyebrow = () => {
  const spans = tree.root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('eyebrow'));
  return spans.length ? String(spans[0].children?.[0] ?? '') : '';
};
check(eyebrow().includes('Class'), 'Class step is now active after World tap');

// Six class deck cards visible immediately.
const classDeckCards = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('class-deck-card'));
check(classDeckCards().length >= 6, `at least 6 class deck cards visible (found ${classDeckCards().length})`);

// Each card has an art element (img or div).
for (const [i, card] of classDeckCards().entries()) {
  const hasImg = card.findAll((n) => n.type === 'img').length > 0;
  const hasDiv = card.findAll((n) => n.type === 'div' && String(n.props.className || '').includes('class-deck-art')).length > 0;
  check(hasImg || hasDiv, `class card ${i + 1} has an art element`);
}

// Primary button is present and enabled at Class step (no required fields).
check(primaryBtns().length >= 1, 'Class step has a primary button');
check(!primaryBtns()[0].props.disabled, 'Class step primary button enabled without interaction');

// ── 9. Tapping a class card makes it selected ─────────────────────────────
const firstCard = classDeckCards()[0];
const secondCard = classDeckCards()[1];
// Second card is not yet selected (aria-checked should be false or absent initially
// for all but the default active one).
TestRenderer.act(() => { secondCard.props.onClick(); });
const updatedCards = classDeckCards();
const selectedCards = updatedCards.filter((c) => c.props['aria-checked'] === true);
check(selectedCards.length === 1, 'exactly one class card is selected after a tap');
check(updatedCards[1].props['aria-checked'] === true, 'the tapped card is the selected one');

// Primary button still enabled after selecting a class.
check(!primaryBtns()[0].props.disabled, 'primary button still enabled after class selection');

// ── 10. Advancing from Class step works (no crash) ────────────────────────
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(eyebrow().includes('Face'), 'advancing from Class step reaches Face step');

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — class deck gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — class deck: fixture exports correct (8 entries, first 6 default, all /reel/ assets), CLASS_EQUIPMENT covers all classes, swapStat keeps total=72, 6 cards visible at step 1, one-tap selection, primary always enabled, zero smithSpin on any Class path.');
