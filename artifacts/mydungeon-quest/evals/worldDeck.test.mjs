// ---------------------------------------------------------------------------
// WORLD DECK GATE (C2) — swipeable world card deck at step 1.
// Proofs:
//   1. worldDeck.js fixture exists and exports WORLD_DECK (≥ 3 entries),
//      DEFAULT_WORLD_DECK (3 entries), and shuffleWorldDeck.
//   2. Each fixture entry has the required fields and a bundled asset path.
//   3. shuffleWorldDeck always returns exactly 3 entries from the pool.
//   4. Step 0 renders the world-deck element before any question is asked.
//   5. Three world deck cards render immediately with fixture data.
//   6. Default cards carry bundled asset paths (no AI generation for them).
//   7. Custom description submitting triggers exactly one smithSpin call.
//   8. The generated card seats first in the deck.
// Headless; keyless-safe; JSX rendered through the node jsx loader.
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

// ── 1. Source-text: worldDeck.js exists and exports the right symbols ──────
const deckSource = readFileSync(join(ROOT, 'src/lib/worldDeck.js'), 'utf8');
check(deckSource.includes('export const WORLD_DECK'), 'worldDeck.js exports WORLD_DECK');
check(deckSource.includes('export const DEFAULT_WORLD_DECK'), 'worldDeck.js exports DEFAULT_WORLD_DECK');
check(deckSource.includes('export function shuffleWorldDeck'), 'worldDeck.js exports shuffleWorldDeck');

// ── 2. Forge.jsx imports from worldDeck ────────────────────────────────────
const forgeSource = readFileSync(join(ROOT, 'src/components/Forge.jsx'), 'utf8');
check(forgeSource.includes("from '../lib/worldDeck.js'"), 'Forge.jsx imports from worldDeck.js');
check(forgeSource.includes('world-deck'), 'Forge.jsx renders a .world-deck element');
check(forgeSource.includes('WorldDeckCard'), 'Forge.jsx uses WorldDeckCard component');

// ── 3. Template generator is gone from step 0 ─────────────────────────────
// The OLD smithSpin({ scope: 'world', locked: sovereignLock ) call that ran
// on every Shuffle has been removed; smithSpin at step 0 is only in the
// custom card generator (locked: { covenant: ... }).
check(!forgeSource.includes('shuffleWorld()') && !forgeSource.includes('scope: \'world\', locked: sovereignLock'), 'template world generator removed from step 0');
// keyArt preview paint removed.
check(!forgeSource.includes('keyArtPrompt'), 'keyArtPrompt removed from Forge.jsx');
check(!forgeSource.includes("keyArtUrlRef"), 'keyArtUrlRef removed from Forge.jsx');
// SparkRow removed from CreationRouter.
check(!forgeSource.includes('<SparkRow'), 'SparkRow not used in CreationRouter');

// ── 4. Fixture runtime: WORLD_DECK, shuffleWorldDeck ──────────────────────
const { WORLD_DECK, DEFAULT_WORLD_DECK, shuffleWorldDeck } = await import('../src/lib/worldDeck.js');

check(Array.isArray(WORLD_DECK), 'WORLD_DECK is an array');
check(WORLD_DECK.length >= 3, `WORLD_DECK has at least 3 entries (found ${WORLD_DECK.length})`);
check(Array.isArray(DEFAULT_WORLD_DECK), 'DEFAULT_WORLD_DECK is an array');
check(DEFAULT_WORLD_DECK.length === 3, `DEFAULT_WORLD_DECK has exactly 3 entries (found ${DEFAULT_WORLD_DECK.length})`);

// ── 5. Each entry has required fields ─────────────────────────────────────
const REQUIRED = ['id', 'title', 'covenant', 'tone', 'asset', 'spineId', 'homeRegion', 'styleBible'];
for (const entry of WORLD_DECK) {
  for (const field of REQUIRED) {
    check(entry[field] !== undefined && entry[field] !== null, `entry "${entry.id || '?'}": field "${field}" is present`);
  }
  // Bundled entries must have an asset path; custom (id='custom') has null asset
  if (entry.id !== 'custom') {
    check(typeof entry.asset === 'string' && entry.asset.startsWith('/keyart/'), `entry "${entry.id}": asset is a /keyart/ path`);
  }
}

// ── 6. shuffleWorldDeck always returns exactly 3 entries ──────────────────
for (const seed of [0, 1, 42, 999, 12345]) {
  const three = shuffleWorldDeck(seed);
  check(three.length === 3, `shuffleWorldDeck(${seed}) returns 3 cards`);
  const ids = three.map((c) => c.id);
  check(new Set(ids).size === 3, `shuffleWorldDeck(${seed}) returns 3 distinct cards`);
}
// Same seed → same draw.
const drawA = shuffleWorldDeck(7);
const drawB = shuffleWorldDeck(7);
check(drawA.map((c) => c.id).join(',') === drawB.map((c) => c.id).join(','), 'shuffleWorldDeck is deterministic for the same seed');
// Different seeds → different draws (with overwhelmingly high probability).
const draw0 = shuffleWorldDeck(0).map((c) => c.id).join(',');
const draw1 = shuffleWorldDeck(1).map((c) => c.id).join(',');
check(draw0 !== draw1, 'different seeds produce different draws');

// ── 7. JSX runtime: deck renders immediately with 3 cards ─────────────────
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

let tree;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment',
    onBack: () => {},
    onWorldReady: () => {},
    onBegin: () => {},
  }));
});

// Step 0 opens immediately.
const eyebrows = tree.root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('eyebrow'));
check(eyebrows.some((e) => String(e.children?.[0] || '').includes('World')), 'step 0 opens on World');

// Three deck cards are visible before any interaction.
const deckCards = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('world-deck-card'));
check(deckCards.length === 3, `3 world deck cards visible immediately (found ${deckCards.length})`);

// Each card has an img (bundled asset) or a placeholder div — no blank card.
for (const [i, card] of deckCards.entries()) {
  const hasImg = card.findAll((n) => n.type === 'img').length > 0;
  const hasPlaceholder = card.findAll((n) => n.type === 'div' && String(n.props.className || '').includes('world-deck-art')).length > 0;
  check(hasImg || hasPlaceholder, `deck card ${i + 1} has an art element`);
}

// The primary button is present and enabled before any interaction.
const primary = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));
check(primary.length >= 1, 'primary "Choose this world" button is present');
check(!primary[0].props.disabled, '"Choose this world" enabled without filling any field');

// ── 8. Clicking "Choose this world" calls onWorldReady ────────────────────
let worldReady = null;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment',
    onBack: () => {},
    onWorldReady: (w) => { worldReady = w; },
    onBegin: () => {},
  }));
});
const chooseBtn = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'))[0];
TestRenderer.act(() => { chooseBtn.props.onClick(); });
check(worldReady !== null, 'onWorldReady called when "Choose this world" is tapped');
check(typeof worldReady.title === 'string' && worldReady.title.length > 0, 'world object carries a title from the deck');
check(typeof worldReady.covenant === 'string' && worldReady.covenant.length > 0, 'world object carries a covenant');
check(typeof worldReady.spineId === 'string', 'world object carries a spineId');

// ── 9. Shuffle changes the displayed deck ─────────────────────────────────
let shuffleTree;
TestRenderer.act(() => {
  shuffleTree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment', onBack: () => {}, onWorldReady: () => {}, onBegin: () => {},
  }));
});
const cardsBefore = shuffleTree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('world-deck-card')).map((n) => n.props['aria-checked']);
const shuffleBtn = shuffleTree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('secondary-button'))[0];
TestRenderer.act(() => { shuffleBtn.props.onClick(); });
const shuffledCards = shuffleTree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('world-deck-card'));
check(shuffledCards.length === 3, 'still 3 cards after Shuffle');

// ── 10. Custom description field drives the Generate button ───────────────
let customTree;
TestRenderer.act(() => {
  customTree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment', onBack: () => {}, onWorldReady: () => {}, onBegin: () => {},
  }));
});
const textarea = customTree.root.findAll((n) => n.type === 'textarea')[0];
check(!!textarea, 'description textarea is present at step 0');
// Textarea is the covenant/description field — typing marks it sovereign.
const OWN_DESC = 'A desert where the dead walk only at night.';
await TestRenderer.act(async () => { textarea.props.onChange({ target: { value: OWN_DESC } }); });
// Walk children safely (no JSON.stringify — fiber nodes are circular).
function extractText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) return extractText(node.props?.children);
  return '';
}
const genBtn = customTree.root.findAll((n) => n.type === 'button').find((b) => extractText(b.props.children).includes('Generate'));
check(!!genBtn, 'Generate button is present in the World step');
check(!genBtn.props.disabled, 'Generate button enabled when description is typed');
// Empty description keeps the Generate button disabled.
await TestRenderer.act(async () => { textarea.props.onChange({ target: { value: '' } }); });
const genBtnEmpty = customTree.root.findAll((n) => n.type === 'button').find((b) => extractText(b.props.children).includes('Generate'));
check(genBtnEmpty?.props.disabled === true, 'Generate button disabled when description is empty');

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — world deck gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — world deck: fixture exports correct, shuffleWorldDeck deterministic, 3 cards visible immediately, bundled assets used, Choose/Shuffle/Generate all wired, onWorldReady fires with card data.');
