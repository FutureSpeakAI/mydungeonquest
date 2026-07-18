// THE QUESTIONS GATE (Directive XIII, Law I) — every asked field carries
// its consequence. The plain-speech FIELD MAP is the ONE seat of the asked
// copy: this gate pins every ask byte-for-byte, pins the fast-path order,
// pins the demotions behind the deep doors, proves the derived shape rule
// is deterministic, and renders both forge doors headless to prove the
// components read the map — and that the X-card is dealt as a CARD, never
// a form. The ask literals may live in NO component source: one seat.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire, register } from 'node:module';
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The forge lives in a browser; the bench does not. Deterministic stubs:
// a fresh device (no X-card dealt), an empty draft shelf, no proving flag.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(`l:${k}`) ? store.get(`l:${k}`) : null), setItem: (k, v) => store.set(`l:${k}`, String(v)), removeItem: (k) => store.delete(`l:${k}`) };
globalThis.sessionStorage = { getItem: (k) => (store.has(`s:${k}`) ? store.get(`s:${k}`) : null), setItem: (k, v) => store.set(`s:${k}`, String(v)), removeItem: (k) => store.delete(`s:${k}`) };
globalThis.window = globalThis.window || { location: { search: '', href: 'http://localhost/' } };

const {
  FIELD_MAP, XCARD_COPY, fastFields, deepFields, spineFromPromise, titleFromPromise, spineLabel
} = await import('fatescript/smith');
const { SPINES } = await import('fatescript/spines');

// —— Law I, the pinned copy: every ask, byte-for-byte. ——
const PINNED = {
  world: {
    spark: 'The three sparks',
    covenant: 'Tell the game your world',
    tone: 'How it feels',
    shape: 'The shape of the promise',
    title: 'Chronicle title',
    spineId: 'Story spine',
    homeRegion: 'Home region',
    linesText: 'Lines — never appear',
    veilsText: 'Veils — fade to black',
    styleBible: 'The world\u2019s look'
  },
  hero: {
    name: 'Their name',
    ancestry: 'Where they come from',
    className: 'Their calling',
    presentation: 'How they present',
    pronouns: 'What words fit them',
    mark: 'The mark that sets them apart',
    keepsake: 'What they carry from home',
    voice: 'Which voice is theirs',
    sigil: 'Sigil',
    bearing: 'Bearing — how the world sees them',
    background: 'Background'
  }
};
for (const scope of ['world', 'hero']) {
  const keys = FIELD_MAP[scope].map((f) => f.key);
  assert.deepEqual(keys.sort(), Object.keys(PINNED[scope]).sort(), `${scope}: the map asks exactly the pinned questions`);
  for (const field of FIELD_MAP[scope]) {
    assert.equal(field.ask, PINNED[scope][field.key], `${scope}.${field.key}: the ask is pinned byte-for-byte`);
    assert.ok(['fast', 'deep', 'derived'].includes(field.door), `${scope}.${field.key}: a lawful door`);
    assert.ok(typeof field.surface === 'string' && field.surface.trim().length > 0, `${scope}.${field.key}: every question names the surface where its answer lands`);
    assert.ok(typeof field.hands === 'string' && field.hands.length > 0, `${scope}.${field.key}: the hands are stated`);
  }
}
assert.equal(XCARD_COPY, 'Tap the X-card at any table and the scene turns away, no questions asked. Lines and veils live behind the Deep Forge door.', 'the X-card copy is pinned');
assert.equal(FIELD_MAP.world.find((f) => f.key === 'covenant').hint, 'One sentence is enough — this is the promise of this world, and Chapter One opens inside it.', 'the promise fine print is pinned');

// —— The fast path asks in the pinned ORDER; the demotions hold. ——
assert.deepEqual(fastFields('world').map((f) => f.key), ['spark', 'covenant', 'tone'], 'the world fast door: sparks, then the promise, then the feel');
assert.deepEqual(fastFields('hero').map((f) => f.key), ['name', 'ancestry', 'className', 'presentation', 'pronouns', 'mark', 'keepsake', 'voice'], 'the hero fast door asks in the pinned order, the voice last');
assert.deepEqual(deepFields('world').map((f) => f.key), ['title', 'spineId', 'homeRegion', 'linesText', 'veilsText', 'styleBible'], 'the world demotions: title, spine, region, lines, veils, look');
assert.deepEqual(deepFields('hero').map((f) => f.key), ['sigil', 'bearing', 'background'], 'the hero demotions: sigil, bearing, background');
assert.equal(FIELD_MAP.world.find((f) => f.key === 'shape').door, 'derived', 'the shape is read, never asked');

// —— The one-seat law: no component source carries an ask literal. ——
const componentSources = await Promise.all((await readdir(new URL('../src/components/', import.meta.url))).filter((f) => f.endsWith('.jsx')).map((f) => readFile(new URL(`../src/components/${f}`, import.meta.url), 'utf8')));
for (const [scope, asks] of Object.entries(PINNED)) {
  for (const [key, copy] of Object.entries(asks)) {
    if (key === 'sigil' || key === 'background') continue; // one-word asks would false-positive on unrelated prose
    for (const source of componentSources) assert.ok(!source.includes(copy), `${scope}.${key}: the ask lives ONLY in the field map, never in a component`);
  }
}

// —— The shape of the promise: deterministic, total, and honest. ——
assert.equal(spineFromPromise('Every year one street vanishes and no one remembers it.'), 'mystery');
assert.equal(spineFromPromise('The crown sits in a vault that has never been opened.'), 'heist');
assert.equal(spineFromPromise('The fog eats the roads after dark.'), 'horror-survival');
assert.equal(spineFromPromise('A kingdom of green hills and old promises.'), 'classic-epic');
assert.equal(spineFromPromise(''), 'classic-epic', 'an empty promise still has a shape');
for (const probe of ['The fog eats the roads after dark.', 'A drowned empire where memories are legal tender.']) {
  assert.equal(spineFromPromise(probe), spineFromPromise(probe), 'same promise, same shape, every time');
  assert.ok(SPINES.some((s) => s.id === spineFromPromise(probe)), 'every shape is a real spine');
  assert.ok(typeof spineLabel(spineFromPromise(probe)) === 'string' && spineLabel(spineFromPromise(probe)).length > 0, 'every shape wears a plain label');
}
assert.ok(titleFromPromise('A drowned empire where memories are legal tender.').startsWith('The Tale of '), 'a typed promise names its own tale');
assert.equal(titleFromPromise('so it goes'), 'The Unwritten Road', 'a promise too short to name falls to the standing title');
assert.equal(titleFromPromise('A drowned empire where memories are legal tender.'), titleFromPromise('A drowned empire where memories are legal tender.'), 'the derived title is deterministic');

// —— The doors render FROM the map (headless), and the X-card is a card. ——
const { WorldForge, HeroForge } = await import('../src/components/Forge.jsx');
const texts = (node) => node.findAll((n) => typeof n.type === 'string').flatMap((n) => n.children).filter((c) => typeof c === 'string');
let world;
TestRenderer.act(() => { world = TestRenderer.create(h(WorldForge, { mediaTier: 'parchment', onBack: () => {}, onContinue: () => {} })); });
const worldText = texts(world.root).join('\n');
for (const key of ['covenant', 'tone', 'shape']) assert.ok(worldText.includes(PINNED.world[key]), `the world fast door asks "${PINNED.world[key]}" from the map`);
const xcard = world.root.findAll((n) => typeof n.type === 'string' && /\bxcard-card\b/.test(String(n.props.className || '')));
assert.equal(xcard.length, 1, 'a fresh device is dealt the X-card on the fast path');
assert.ok(texts(xcard[0]).join(' ').includes(XCARD_COPY), 'the X-card speaks the pinned copy');
assert.equal(xcard[0].findAll((n) => ['input', 'textarea', 'select', 'form'].includes(n.type)).length, 0, 'the X-card is a card, never a form');
assert.equal(world.root.findAll((n) => typeof n.type === 'string' && /\bspark-card\b/.test(String(n.props.className || ''))).length, 3, 'the three sparks lead the door');
localStorage.setItem('mdq:xcard:seen', '1');
let second;
TestRenderer.act(() => { second = TestRenderer.create(h(WorldForge, { mediaTier: 'parchment', onBack: () => {}, onContinue: () => {} })); });
assert.equal(second.root.findAll((n) => typeof n.type === 'string' && /\bxcard-card\b/.test(String(n.props.className || ''))).length, 0, 'the X-card is dealt once per device');

let hero;
TestRenderer.act(() => { hero = TestRenderer.create(h(HeroForge, { world: { title: 'The Probe' }, mediaTier: 'parchment', onBack: () => {}, onBegin: () => {} })); });
const heroText = texts(hero.root).join('\n');
const fastAsks = fastFields('hero').map((f) => PINNED.hero[f.key]);
for (const copy of fastAsks) assert.ok(heroText.includes(copy), `the hero door asks "${copy}" from the map`);
let cursor = -1;
for (const copy of fastAsks) { const at = heroText.indexOf(copy); assert.ok(at > cursor, `"${copy}" is asked in the pinned order`); cursor = at; }

console.log('PASS — the questions gate: every ask pinned byte-for-byte in the one-seat field map with its consequence named, fast-path order and demotions held, the shape read deterministically from the promise, both doors rendering from the map, and the X-card dealt once as a card, never a form.');
